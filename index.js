require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

// create the express application:
const app = express();
const port = process.env.PORT || 5000;

// middlewares:
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
      // await client.connect();

      // create database and data collections:
      const db = client.db('One_Drop');
      const userCollection = db.collection("users");
      const districtsCollection = db.collection("districts");
      const upazilaCollection = db.collection("upazilas");

      // 01. TESTING RELATED API: TEST IF THE API IS WORKING FINE OR NOT
      app.get('/', (req, res) => {
         res.send('Serever is running....')
      })


      // 02. USER RELATED API: CREATE A NEW USER
      app.post('/users', async (req, res) => {
         const user = req.body;
         user.role = 'donor';
         user.status = 'active',
         user.createdAt = new Date();

         const result = await userCollection.insertOne(user);
         res.send(result);
      })

      // 03. USER RELATED API: RETRIVE USERS
      app.get('/users', async (req, res) => {
         const result = await userCollection.find().toArray();
         res.send(result);
      })

      // 04. USER RELATED API: RETRIVE A PARTICULAR USER USING ID
      app.get('/users/:id', async (req, res) => {
         const id = req.params.id;
         const filter = {_id: new ObjectId(id)};
         const result = await userCollection.findOne(filter);
         res.send(result);
      })
      
      // 05. DISTRICTS RELATED API: RETRIVE ALL THE DISCTRICTS;
      app.get('/districts', async (req, res) => {
         const result = await districtsCollection.find().toArray();
         res.send(result);
      })

      // 06. DISTRICTS RELATED API: RETRIVE A SINGLE DISCTICT
      app.get('/districts/:id', async (req, res) => {
         const id = req.params.id;
         const filter = {name: 'districts'};
         const result = await districtsCollection.findOne(filter);
         const data = result.data;
         const finalData = data.find(item => item.id === id) || {success: false, message: 'Data Not Found'};
         res.send(finalData);
      })

      // 05. UPAZILAS RELATED API: RETRIVE ALL THE UPAZILAS
      app.get('/upazilas', async (req, res) => {
         const result = await upazilaCollection.find().toArray();
         res.send(result);
      })



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