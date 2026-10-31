import express  from'express';
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import cors from "cors";

const client = new MongoClient(process.env.MONGODB_URL)

export async function connectToMongodb() {
    try{
        await client.connect();
        console.log("You successfully connected to Mongodb!")
        return client;
    } catch(err) {
        console.dir(err);
    }

    
}
const mongoClient = await connectToMongodb();

const db = mongoClient.db("kowshik")
const destinationCollection = db.collection("destination")


const app = express ()
const PORT = process.env.PORT || 8000 ;
app.use(cors());
app.use(express.json());

app.get('/', (req , res) => {
    res.send({message: 'sarver is runing fine!'})
});



app.post('/add-destination', async (req , res) => {
    const data = req.body

    const result = await destinationCollection.insertOne(data)
    console.log(result)
    res.send(result)
    // console.log(data);
    // res.send({message: 'API working!'})
});

app.get('/destinations', async (req, res) => {
    const result =  await destinationCollection.find().toArray()
    res.send(result)
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
});