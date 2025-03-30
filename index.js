require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// CREATE THE EXPRESS APPLICATION AND SPECIFY THE PORT NUMBER:
const app = express();
const port = process.env.PORT || 5000;

// APPLICATION LEVEL MIDDLEWARES:
app.use(cors({
   origin: ['http://localhost:5173', 'https://one-drop.netlify.app'],
   credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// CUSTOM MIDDLEWARES: validateExistingUser
const validateExistingUsre = async (req, res, next) => {
   // 01. get the user email from the request body
   const { email } = req.body;

   // 02. create a filter using the user email
   const filter = { email: email }

   // 03. find the specific user using the filter created above
   const isExistingUser = await userCollection.findOne(filter);

   // 04. modify the request body
   if (isExistingUser) {
      // add a property named 'isExistingUser' in the request body
      req.body.isExistingUser = true;

      // add another property 'user' in the request body which will hold the user information
      req.body.user = isExistingUser;
   } else {
      req.body.isExistingUser = false;
   }

   // 05. go to the next step
   next();
};

// CUSTOM MIDDLEWARE: isAdmin
const isAdmin = async (req, res, next) => {
   const filter = {};

   // get the user email from the request body
   const userEmail = req.body.userEmail;

   // when the user email is not provided
   if (!userEmail) {
      return res.status(401).send({
         success: false,
         message: "User's email is missing. Please provide the user's email",
         statusCode: 401
      });
   };

   // update the filter with user email and find the user;
   filter.email = userEmail;

   try {
      const user = await userCollection.findOne(filter);

      // when the user does not exist
      if (!user) {
         return res.status(401).send({
            success: false,
            message: "Unauthorized access",
         });
      };

      // when the role of the user is not admin
      if (user.role !== 'admin') {
         return res.status(401).send({
            success: false,
            message: 'Unauthorized Access',
            statusCode: 401
         })
      }

      // finally call the next function
      next();
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong!!' });
   }

};

// CUSTOM MIDDLEWARES: verifyUser
const verifyToken = async (req, res, next) => {
   const { verification_token } = req.cookies;

   if (!verification_token) return res.json({ message: 'cookies not found' })

   try {
      const decoded = jwt.verify(verification_token, process.env.JWT_SECRET);
      if (!decoded) return res.status(403).json({ success: false, message: 'Porbiden Access' });
      req.decoded = decoded;
      next();
   } catch (error) {
      return res.status(401).json({ success: false, message: 'Unauthorized access!!', error })
   }
};

// CUSTOM MIDDLEWARE: VERIFY THE USER ROLE [THIS MIDDLWARE SHALL BE CALLED AFTER THE 'verifyToken' MIDDLEWARE]
const verifyUserRole = async (req, res, next) => {
   const filter = {};

   // get the user email from the request body
   const userEmail = req.decoded.email;

   // when the user email is not provided
   if (!userEmail) {
      return res.status(401).send({
         success: false,
         message: "User's email is missing. Please provide the user's email",
         statusCode: 401
      });
   };

   // update the filter with user email and find the user;
   filter.email = userEmail;
   const user = await userCollection.findOne(filter);

   // when the user does not exist
   if (!user) {
      return res.status(401).send({
         success: false,
         message: "Unauthorized access",
      });
   };

   req.userRole = {
      isAdmin: user.role === 'admin',
      isDonor: user.role === 'donor',
      isVolunteer: user.role === 'volunteer'
   }

   // finally call the next function
   next();
}

// MONGODB URI
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.fev0e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});

// CREATE DATABASE AND DATA COLLECTIONS:
const db = client.db('One_Drop');
const userCollection = db.collection("users");
const districtsCollection = db.collection("districts");
const upazilaCollection = db.collection("upazilas");
const donationRequestCollection = db.collection("donation_requests");
const blogsCollection = db.collection('blogs');
const donorsCollection = db.collection('donors');

// FUNCTION TO CALCULATE GROWTH PERCENTAGE
const calculateGrowthPercentage = async (collection, dateField) => {
   // current period value: for monthly report
   const currentDate = new Date();
   const lastMonthDate = new Date();
   lastMonthDate.setMonth(currentDate.getMonth() - 1);
   const currentPeriodValue = await collection.countDocuments({
      [dateField]: {
         $gte: lastMonthDate, $lte: currentDate
      }
   });

   // previous period value: for monthly report
   const previousMonthDate = new Date();
   previousMonthDate.setMonth(lastMonthDate.getMonth() - 1);
   const previousPeriodValue = await collection.countDocuments({
      [dateField]: {
         $gte: previousMonthDate, $lt: lastMonthDate
      }
   });

   // calculate growth percentage
   let growthPercentage = 0;
   if (previousPeriodValue > 0) {
      growthPercentage = ((currentPeriodValue - previousPeriodValue) / previousPeriodValue) * 100;
   };

   return growthPercentage;
};

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();

      // 01. JWT RELATED API: CREATE JWT TOKEN
      app.post('/jwt/generate-verification-token', async (req, res) => {
         const { displayName, email } = req.body;
         const user = { displayName, email };

         try {
            // create jwt token
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5h' });

            res.cookie('verification_token', token, {
               httpOnly: true,
               secure: process.env.NODE_ENV === "production",
               sameSite: 'none'
            });

            return res.json({
               success: true,
               varification_token: token,
               user,
               message: 'verification token has been created successfully'
            });
         } catch (error) {
            return res.json({ success: false, message: 'Something went wrong and could not generate the token', error });
         }
      });

      // 02. JWT RELATED API: CLEAR THE VERIFICATION TOKEN
      app.post('/jwt/clear-verification-token', (req, res) => {
         res.clearCookie('verification_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
         });

         res.json({
            success: true,
            message: 'Logout successfully'
         });
      });

      // GET USER PROFILE
      app.get('/get-myProfile', verifyToken, async (req, res) => {
         const { email, userName } = req.decoded;
         const { userEmail } = req.body;

         // check if the user email is provided
         if (!userEmail) return res.json({ success: false, message: "Please provide the user email" });

         // check if the user's email matches with the token credentials email
         if (userEmail !== email) return res.json({ success: false, message: 'Unauthorized access!!' });

         return res.json({
            success: true,
            message: 'Your profile is retured successfully!',
            user: {
               name: userName,
               email: userEmail
            }
         });
      });

      // JWT RELATED API: VERIFY THE TOKEN
      app.post('/jwt/verify-token', async (req, res) => {
         const { verification_token } = req.cookies;

         // if there is no token
         if (!verification_token) return res.status(401).send({ success: false, message: 'Unauthorized access!!' });

         try {
            const decodedData = jwt.verify(verification_token, process.env.JWT_SECRET)
            req.decoded = decodedData;

            if (!decodedData) return res.json({ success: false, message: 'Something went wrong!!' })
         } catch (error) {
            return res.status(401).send({ success: false, message: 'Unauthorized access!!' });
         }

         return res.json({ verification_token, decodedObj });
      })

      // 03. TESTING RELATED API: TEST IF THE API IS WORKING FINE OR NOT
      app.get('/', (req, res) => {
         res.send('Serever is running....')
      })

      // 04. USER RELATED API => CREATE A NEW USER
      app.post('/users', validateExistingUsre, async (req, res) => {
         // when the user is an existing user, return early with response to client
         if (req.body.isExistingUser) {
            return res.send({ isExistingUser: true, insertedId: null, message: 'user already exists' });
         }

         // user information to be saved
         const user = req.body;
         user.role = 'donor';
         user.status = 'active';
         user.createdAt = new Date();

         // save user information in the users collection
         const result = await userCollection.insertOne(user);

         // send response to the client
         result.message = 'user created successfully';
         result.isExistingUser = false;
         res.send(result);
      });

      // 05. USER RELATED API => UPDATE AN EXISTING USER
      app.patch('/users', validateExistingUsre, async (req, res) => {
         // when the user is an existing user
         if (req.body.isExistingUser) {
            const userInfo = req.body.updatedInfo;
            const filter = { email: req.body.user.email };
            const options = { upsert: true };

            const updatedDoc = {
               $set: {
                  name: userInfo.name,
                  email: userInfo.email,
                  district: userInfo.district,
                  upazila: userInfo.upazila,
                  blood: userInfo.blood,
                  lastModifiedAt: new Date()
               }
            }

            try {
               const result = await userCollection.updateOne(filter, updatedDoc, options);
               res.send(result);
            } catch (error) {
               return res.send({ success: false, message: 'Something went wrong' })
            }
         } else {
            res.send({ success: false, message: 'Unable to make update as the user does not exist' });
         }
      })

      // 06. USER RELATED API => UPDATE A SINGLE USER
      app.patch('/users/update/:id', isAdmin, async (req, res) => {
         const id = req.params.id;
         const filter = {};

         // if there is id
         if (id) {
            filter._id = new ObjectId(id);
         }

         const updatedDoc = {
            $set: {
               ...req.body.updatedInfo,
               lastModifiedAt: new Date()
            }
         }

         const options = { upsert: true };

         const result = await userCollection.updateOne(filter, updatedDoc, options);
         res.send(result);

      });

      // 07. USER RELATED API => RETRIVE USERS
      app.get('/users', async (req, res) => {
         const filter = {};

         // filter using email
         if (req.query.email) {
            filter.email = req.query.email;
         }

         // filter using user's status
         if (req.query.status) {
            filter.status = req.query.status;
         }

         const result = await userCollection.find(filter).toArray();
         res.send(result);
      })

      // 08. USER RELATED API => RETRIVE A PARTICULAR USER USING ID
      app.get('/users/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const result = await userCollection.findOne(filter);
         res.send(result);
      })

      // 09. DONATION REQUEST RELATED API => CREATE A DONATION REQUEST
      app.post('/donation-requests', verifyToken, async (req, res) => {
         const donationRequest = req.body.donationRequest;
         donationRequest.createdAt = new Date();
         const result = await donationRequestCollection.insertOne(donationRequest);
         res.send(result);
      });

      // 10. DONATION REQUEST RELATED API => RETRIVE A SINGLE DONATION REQUEST DATA
      app.get('/donation-requests/:id', verifyToken, async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const result = await donationRequestCollection.findOne(filter);
         res.send(result);
      })

      // 11. DONATION REQUEST RELATED API => RETRIVE DONATION REQUESTS
      app.get('/donation-requests', verifyToken, async (req, res) => {

         const filter = {};
         let count = 0;
         const sortingOption = { createdAt: -1 }

         // filter based on user's email, if the email is passed through the query parameter
         if (req.query.email) {
            filter.requesterEmail = req.query.email;
         };

         // filter based on the donation status
         if (req.query.filter) {
            filter.status = req.query.filter;
         }

         // filter based on the blood group
         if (req.query.bloodGroup) {
            filter.bloodGroup = req.query.bloodGroup === '' ? '' : decodeURIComponent(req.query.bloodGroup);
         }

         // search data using the recipient's name
         if (req.query.search) {
            filter.recipientName = {
               $regex: req.query.search,
               $options: "i"
            };
         }

         // specify the number of documents
         if (req.query.count) {
            const countNumber = parseInt(req.query.count);
            count = countNumber;
            sortingOption.createdAt = -1;
         }

         // sorting
         if (req.query.sort) {
            if (req.query.sort === 'ace') {
               sortingOption.createdAt = 1
            }

            if (req.query.sort === 'dce') {
               sortingOption.createdAt = -1
            }
         }

         const result = await donationRequestCollection.find(filter).sort(sortingOption).limit(count).toArray();
         res.json({
            data: result,
            success: true,
            message: 'Data is returned successfully',
            decoded: req.decoded || {}
         });
      })

      // 12. DONATION REQUEST RELATED API: UPDATE A SINGLE DONATION REQUEST
      app.patch('/donation-requests/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };

         const updatedDoc = {
            $set: {
               ...req.body.donationRequest,
               lastModifiedAt: new Date()
            }
         }
         const options = { upsert: true }

         const result = await donationRequestCollection.updateOne(filter, updatedDoc, options);

         // save the donor iformation in the database
         const donorInfo = req.body.donationRequest.donorInfo;
         if (donorInfo) {
            const donorExists = await donorsCollection.findOne({ email: donorInfo.email });
            if (!donorExists) {
               const saveDonor = await donorsCollection.insertOne(donorInfo);
            }
         }

         // send the result
         res.send(result);
      })

      // 13. DONATION REQUEST RELATED API: DELETE A DONATION REQUEST
      app.delete('/donation-requests/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const result = await donationRequestCollection.deleteOne(filter);
         result.filter = filter;
         res.send(result);
      });

      // 14. BLOGS RELATED API: RETRIVE ALL BLOGS
      app.get('/blogs', async (req, res) => {
         const filter = {};

         // filter using the status
         if (req.query.status) {
            filter.status = req.query.status;
         }

         const result = await blogsCollection.find(filter).toArray();
         res.send(result);
      });

      // 15. BLOGS RELATED API: RETRIVE A SINGLE BLOG USING BLOG ID
      app.get('/blogs/:id', verifyToken, async (req, res) => {
         const id = req.params.id;
         const filter = {
            _id: new ObjectId(id)
         }

         const result = await blogsCollection.findOne(filter);
         res.send(result);
      })

      // 16. BLOGS RELATED API: CREATE AND SAVE A BLOG
      app.post('/blogs', verifyToken, async (req, res) => {
         const newBlog = req.body.blog;
         newBlog.createdAt = new Date();
         const result = await blogsCollection.insertOne(newBlog);
         res.send(result);
      });

      // 17. BLOGS RELATED API: UPDATE A SINGLE BLOG
      app.patch('/blogs/:id', verifyToken, verifyUserRole, async (req, res) => {
         const id = req.params.id;
         const filter = {
            _id: new ObjectId(id)
         };

         const isDonor = req.userRole.isDonor;

         // allow donor to do actions upon his or her blogs only [NOT OTHERS BLOGS]
         // check if both the current user and the blog author are the same persons
         if (isDonor) {
            const userEmail = req.decoded.email;
            const blog = await blogsCollection.findOne(filter);
            const blogAuthorEmail = blog.author.email;

            if (userEmail !== blogAuthorEmail) {
               return res.status(401).json({ success: false, message: 'Unauthorized access' });
            }
         }

         const options = { upsert: true };
         const updatedDoc = {
            $set: {
               ...req.body.blog,
               lastModifiedAt: new Date()
            }
         };

         const result = await blogsCollection.updateOne(filter, updatedDoc, options);
         res.send(result);
      })

      // 18. BLOGS RELATED API: DELETE A SINGLE BLOG USING THE BLOG ID
      app.delete('/blogs/:id', verifyToken, verifyUserRole, async (req, res) => {
         const id = req.params.id;
         const filter = {
            _id: new ObjectId(id)
         }

         const isDonor = req.userRole.isDonor;

         // allow donor to delete his or her blogs only [NOT OTHERS BLOGS]
         if (isDonor) {
            const userEmail = req.decoded.email;
            const blog = await blogsCollection.findOne(filter);
            const blogAuthorEmail = blog.author.email;

            if (userEmail !== blogAuthorEmail) {
               return res.status(401).json({ success: false, message: 'Unauthorized accesss'})
            }
         }

         const result = await blogsCollection.deleteOne(filter);
         res.send(result);
      });

      // 19. ADMIN STATISTICS RELATED API:
      app.get('/admin/statistics', async (req, res) => {
         // user related data;
         const userCount = await userCollection.estimatedDocumentCount();
         const userGrowth = await calculateGrowthPercentage(userCollection, 'createdAt')
         const users = {
            count: userCount,
            growth: userGrowth.toFixed(1) + '%'
         }

         // blood donation requests related data
         const bloodDonationRequestsCount = await donationRequestCollection.estimatedDocumentCount();
         const donationGrowth = await calculateGrowthPercentage(donationRequestCollection, 'createdAt')
         const bloodDonationRequests = {
            count: bloodDonationRequestsCount,
            growth: donationGrowth.toFixed(1) + '%'
         }

         // funds related data;
         const funds = {
            totalCollection: 0
         }

         const result = { users, bloodDonationRequests, funds };
         res.send(result);
      })

      // 20. DISTRICTS RELATED API: RETRIVE ALL THE DISCTRICTS;
      app.get('/districts', async (req, res) => {
         const result = await districtsCollection.find().toArray();
         res.send(result);
      });

      // 21. DISTRICTS RELATED API: RETRIVE A SINGLE DISCTICT
      app.get('/districts/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { name: 'districts' };
         const result = await districtsCollection.findOne(filter);
         const data = result.data;
         const finalData = data.find(item => item.id === id) || { success: false, message: 'Data Not Found' };
         res.send(finalData);
      });

      // 22. UPAZILAS RELATED API: RETRIVE ALL THE UPAZILAS
      app.get('/upazilas', async (req, res) => {
         const result = await upazilaCollection.find().toArray();
         res.send(result);
      });

      // 23. UPAZILAS RELATED API: RETRIVE A SINGLE UPAZILA DATA
      app.get('/upazilas/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { name: 'upazilas' };
         const result = await upazilaCollection.findOne(filter);
         const data = result.data;
         const finalData = data.find(item => item.id === id) || { success: false, message: "Data Not Found" };
         res.send(finalData);
      });



      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      // console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);



// listen the sever:
app.listen(port, () => {
   console.log(`One Drop Server is running on port: ${port}`);
})