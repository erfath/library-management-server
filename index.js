const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rlxfp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorize Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const booksCollection = client.db('libraryManagement').collection('books')
        const borrowCollection = client.db('libraryManagement').collection('borrow')
        const usersCollection = client.db('libraryManagement').collection('users')

        app.get('/book', async (req, res) => {
            const query = {}
            const cursor = booksCollection.find(query);
            const books = await cursor.toArray()
            res.send(books);
        });

        app.post('/book', async (req, res)=>{
            const book = req.body;
            const result = await booksCollection.insertOne(book);
            res.send(result)
        })

        app.delete('/book/:id', verifyJWT, async (req, res)=>{
            const id = req.params.id;
            const query = {_id : ObjectId(id)}
            const result = await booksCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/book/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const book = await booksCollection.findOne(query);
            res.send(book);
        })

        app.post('/borrow', async (req, res) => {
            const borrow = req.body;
            const result = await borrowCollection.insertOne(borrow)
            res.send(result)
            console.log(result)
        })

        app.get('/borrow', async (req, res) => {
            const userEmail = req.query.userEmail;
            const query = { userEmail: userEmail };
            const borrowBooks = await borrowCollection.find(query).toArray();
            res.send(borrowBooks);
        })

        app.get('/issue', verifyJWT, async (req, res)=>{
            const books = await borrowCollection.find().toArray();
            res.send(books);
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        app.delete('/user/:email', async (req, res)=>{
            const email = req.params.email;
            const deleteUser = await usersCollection.deleteOne({email: email})
            res.send(deleteUser);
        })

        app.get('/admin/:email', async (req, res)=>{
            const email = req.params.email;
            const user = await usersCollection.findOne({email: email});
            const isAdmin = user?.role=== 'admin';
            res.send({admin: isAdmin})
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAcc = await usersCollection.findOne({ email: requester });
            if (requesterAcc.role === "admin") {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else{
                res.status(403).send({message: "forbidden"})
            }

        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        })

    }
    finally {

    }


}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Library Port')
});

app.listen(port, () => {
    console.log('listening to port', port)
});