require('dotenv').config();
const express = require('express');
const cors = require('cors');
const port = process.env.SERVER_PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

// CREATE EXPRESS APPLICATION INSTANCE
const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.fev0e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});
async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      //  await client.connect();

      // DATABASE COLLECTIONS:
      const db = client.db("one-drop");
      const usersCollection = db.collection("users");
      const districtsCollection = db.collection("districts");
      const upazilaCollection = db.collection("upazilas");

      // API END POINTS
      app.get('/', (req, res) => {
         res.send('Server is running..')
      });


      // API END POINT: REGISTER OR CREATE AN USER
      app.post("/users", async (req, res) => {
         // initial user information
         const userData = req.body;
        
         // default avatar
         const defaultAvatar = 'https://img.icons8.com/?size=100&id=84020&format=png&color=000000';
         // add additional information in the userData
         if (!userData.photoURL) {
            userData.photoURL = defaultAvatar;
         }
         userData.status = "active";
         userData.role = "donor";
         userData.createdAt = new Date();

         // save the user in the database
         const result = await usersCollection.insertOne(userData);
         res.send(result);  
      })

      // API END POINT: GET USERS
      app.get("/users", async (req, res) => {
         const data = await usersCollection.find().toArray();
         res.send(data);
      })

      // API END POINT: GET A PARTICULAR USER USING USER ID
      app.get("/users/:id", async (req, res) => {
         const id = req.params.id;
         const filter = {
            _id : new ObjectId(id)
         };
         const result = usersCollection.findOne(filter);
         res.send(result);
      })




      // Send a ping to confirm a successful connection
      //  await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      //  await client.close();
   }
}
run().catch(console.dir);

// LISTEN
app.listen(port, () => {
   console.log(`Server is running on: http://localhost:${port}`);
})