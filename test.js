const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const Joi = require('joi');
const config = require('config');

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
        res.status(200).send(`Film ${saved_film.title} saved to database`)
    }catch(err) {
        res.send(err.message)
    }
    
})

app.use(express.json({
    type: ['application/json', 'text/plain'],
    limit: '50mb'
}));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Credentials");
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    next()
})

app.get('/find', auth, async (req, res) => {
    try {
        const all_films = await Film.find()
        return res.json(all_films);
    } catch (error) {
        res.json({error: error})
    }

})
app.get('/find/:title', async (req, res) => {
    try {
        const films = await Film.findOne({title: req.params.title})
        if(films) {
            return res.json(films)
        } else {
            return res.json(`The movie with the title ${req.params.title} wasn't found`);
        }
    } catch(error) {
        res.json({error: error})
    }
})


const user_schema = new mongoose.Schema({
    username: String,
    password: String
})
const User = mongoose.model('User', user_schema);


app.post('/register', async (req, res) => {
    try {
        let user_data = _.pick(req.body, ['username', 'password']);
        const {error} = validate_data(user_data);
        if(error) return res.json(error.message);

        const username_taken = await User.findOne({username: user_data.username});
        if(username_taken) return res.json(`Username ${username_taken.username} is already taken`);

        const salt = await bcrypt.genSalt(5);
        const crypted_password = await bcrypt.hash(user_data.password, salt);
        user_data.password = crypted_password;
        
        const new_user = new User(user_data);
        console.log(new_user);
        new_user.save();
        res.json(new_user);
    } catch (error) {
        res.json(error.message);
    }
})

function validate_data(user_data) {
    const joi_schema = Joi.object({
        username: Joi.string().min(3).max(15).required(),
        password: Joi.string().min(3).max(15).required()
    })
    return joi_schema.validate(user_data);
}

app.post('/login', async (req, res) => {
    console.log('evo meeeee');
    let login_message = {
        username: '',
        logged_in: '',
        token: '',
        error_message: ''
    }
    try {
        const user_data = _.pick(req.body, ['username', 'password']);
        const {error} = validate_data(user_data);

        if(error) {
            login_message.logged_in = false;
            login_message.error_message = error.message
            return res.json(login_message);
        }

        const user_registered = await User.findOne({username: user_data.username});
        if(!user_registered) {
            login_message.logged_in = false;
            login_message.error_message = `User with username ${user_data.username} doesn't exist`;
            return res.json(login_message);
        }

        const password_correct = await bcrypt.compare(user_data.password, user_registered.password);
        if(!password_correct) {
            login_message.logged_in = false;
            login_message.error_message = `Username or password are incorrect`;
            return res.json(login_message);

        }
        
        const token = jwt.sign(user_data, config.get('jwtPrivateKey'))
        login_message.logged_in = true;
        login_message.username = user_data.username
        login_message.token = token;
        res.json(login_message);

    } catch (error) {
        login_message.logged_in = false;
        login_message.rror_message = error.message;
        return res.json(login_message);
    }
})

function auth(req, res, next) {

    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded_payload = jwt.verify(token, config.get('jwtPrivateKey'));
        next()
    } catch (error) {
        return res.json({error: error});
    }
}