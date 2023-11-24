const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

server.listen(2000, 'localhost', () => {console.log("Server is listening on port 2000")});

const mongoAddress = `mongodb+srv://goran:1234@cluster0.pg5bd.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(mongoAddress, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to the database'))
    .catch(err => console.log(err))

const schema_film = new mongoose.Schema({
    title: String,
    year: Number
})

const Film = mongoose.model('Film', schema_film);

app.get('/film/:title/:year', async (req, res) => {
    const new_film = new Film({
        title: req.params.title,
        year: req.params.year
    })
    try {
        const saved_film = await new_film.save();
        console.log(saved_film._id);
        res.status(200).send(`Film ${saved_film.title} saved to database`)
    }catch(err) {
        console.log(err.message)
        res.send(err.message)
    }
    console.log('posle greske')
    
})
app.use(function (req, res, next) {
    /* res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); */
    /* res.setHeader('Access-Control-Allow-Credentials', true); */
    
    /* res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Credentials"); */
    /* res.setHeader('Access-Control-Allow-Origin', '*'); */
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader("Access-Control-Allow-Headers", "Authorization")
    next()
})

app.get('/find', async (req, res) => {
    console.log(req.headers['authorization'])
    
    const all_films = await Film.find()
    res.json(all_films);
})
app.get('/find/:title', async (req, res) => {
    try {
        const films = await Film.findOne({title: req.params.title})
        console.log(films)
        if(films) {
            res.json([films])
        } else {
            res.json(`The movie with the title ${req.params.title} wasn't found`);
        }
    } catch(err) {

    }
    
})
