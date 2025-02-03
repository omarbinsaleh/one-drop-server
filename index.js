require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

// CREATE THE EXPRESS APPLICATION AND SPECIFY THE PORT NUMBER:
const app = express();
const port = process.env.PORT || 5000;

// APPLICATION LEVEL MIDDLEWARES:
app.use(cors({
   origin: ['http://localhost:5173', 'https://one-drop.netlify.app'],
}));
app.use(express.json());

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

// CUSTOM MIDDLEWARE DEFINATION: VALIDATE EXISTING USER USING EMAIL
const validateExistingUsre = async (req, res, next) => {
   const { email } = req.body;
   const filter = { email: email }
   const isExistingUser = await userCollection.findOne(filter);
   if (isExistingUser) {
      req.body.isExistingUser = true;
      req.body.user = isExistingUser;
   } else {
      req.body.isExistingUser = false;
   }

   next();
}

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();

      // 01. TESTING RELATED API: TEST IF THE API IS WORKING FINE OR NOT
      app.get('/', (req, res) => {
         res.send('Serever is running....')
      })

      // 02. USER RELATED API => CREATE A NEW USER
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

      // USER RELATED API => UPDATE AN EXISTING USER
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

            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
         } else {
            res.send({ success: false, message: 'Something went wrong' })
         }
      })

      // 03. USER RELATED API => RETRIVE USERS
      app.get('/users', async (req, res) => {
         const filter = {};

         if (req.query.email) {
            filter.email = req.query.email;
         }

         const result = await userCollection.find(filter).toArray();
         res.send(result);
      })

      // 04. USER RELATED API => RETRIVE A PARTICULAR USER USING ID
      app.get('/users/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const result = await userCollection.findOne(filter);
         res.send(result);
      })

      // DONATION REQUEST RELATED API => CREATE A DONATION REQUEST
      app.post('/donation-requests', async (req, res) => {
         const donationRequest = req.body.donationRequest;
         donationRequest.createdAt = new Date();
         const result = await donationRequestCollection.insertOne(donationRequest);
         res.send(result);
      });

      // DONATION REQUEST RELATED API => RETRIVE A SINGLE DONATION REQUEST DATA
      app.get('/donation-requests/:id', async (req, res) => {
         const id = req.params.id;
         const filter = {_id: new ObjectId(id)};
         const result = await donationRequestCollection.findOne(filter);
         res.send(result);
      })

      // DONATION REQUEST RELATED API => RETRIVE DONATION REQUESTS
      app.get('/donation-requests', async (req, res) => {
         const filter = {};
         let count = 0;
         const sortingOption = {createdAt: -1}

         // filter based on user's email, if the email is passed through the query parameter
         if (req.query.email) {
            filter.requesterEmail = req.query.email;
         };

         // filter based on the donation status
         if(req.query.filter) {
            filter.status = req.query.filter;
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
         res.send(result);
      })

      // DONATION REQUEST RELATED API: UPDATE A SINGLE DONATION REQUEST
      app.patch('/donation-requests/:id', async (req, res) => {
         const id = req.params.id;
         const filter = {_id: new ObjectId(id)};
         const updatedDoc = {
            $set: {
               ...req.body.donationRequest,
               lastModifiedAt: new Date()
            }
         }
         const options = { upsert: true }

         const result = await donationRequestCollection.updateOne(filter, updatedDoc, options);
         res.send(result);
      })

      // DONATION REQUEST RELATED API: DELETE A DONATION REQUEST
      app.delete('/donation-requests/:id', async (req, res) => {
         const id = req.params.id;
         const filter = {_id: new ObjectId(id)};
         const result = await donationRequestCollection.deleteOne(filter);
         result.filter = filter;
         res.send(result);
      })

      // 05. DISTRICTS RELATED API: RETRIVE ALL THE DISCTRICTS;
      app.get('/districts', async (req, res) => {
         const result = await districtsCollection.find().toArray();
         res.send(result);
      });

      // 06. DISTRICTS RELATED API: RETRIVE A SINGLE DISCTICT
      app.get('/districts/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { name: 'districts' };
         const result = await districtsCollection.findOne(filter);
         const data = result.data;
         const finalData = data.find(item => item.id === id) || { success: false, message: 'Data Not Found' };
         res.send(finalData);
      });

      // 07. UPAZILAS RELATED API: RETRIVE ALL THE UPAZILAS
      app.get('/upazilas', async (req, res) => {
         const result = await upazilaCollection.find().toArray();
         res.send(result);
      });

      // UPAZILAS RELATED API: RETRIVE A SINGLE UPAZILA DATA
      app.get('/upazilas/:id', async (req, res) => {
         const id = req.params.id;
         const filter = { name: 'upazilas' };
         const result = await upazilaCollection.findOne(filter);
         const data = result.data;
         const finalData = data.find(item => item.id === id) || { success: false, message: "Data Not Found" };
         res.send(finalData);
      });



      // Send a ping to confirm a successful connection
      // await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
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