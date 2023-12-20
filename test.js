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
const cookieParser = require('cookie-parser');


server.listen(2000, 'localhost', () => {console.log("Server is listening on port 2000")});

const mongoAddress = `mongodb+srv://goran:1234@cluster0.pg5bd.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(mongoAddress, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to the database'))
    .catch(error => console.log(error))

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
    }catch (error) {
        res.json({error: modify_error(error)})
    }
    
})

app.use(express.json({
    type: ['application/json', 'text/plain'],
    limit: '50mb'
}));
app.use(cookieParser());

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Credentials");
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    next()
})

app.get('/find', auth_cookie, async (req, res) => {
    try {
        const all_films = await Film.find()
        return res.json(all_films);
    } catch (error) {
        res.json({error: modify_error(error)})
    }

})
app.post('/findFilm', auth_cookie, async (req, res) => {
    try {
        const film = await Film.findOne({title: req.body.title})
        if(film) {
            return res.json(film)
        } else {
            return res.json(`The movie with the title ${req.body.title} wasn't found`);
        }
    } catch(error) {
        res.json({error: modify_error(error)})
    }
})


const user_schema = new mongoose.Schema({
    username: String,
    password: String
})
const User = mongoose.model('User', user_schema);


app.post('/register', async (req, res) => {
    let registration_msg = {
        registered: '',
        username: '',
        failure_msg: ''
    }
    try {
        let user_data = _.pick(req.body, ['username', 'password']);
        
        const {error} = validate_data(user_data);
        if(error) {
            registration_msg.registered = false;
            registration_msg.failure_msg = error.message;
            return res.json({registration_msg: registration_msg});
        }
        const username_taken = await User.findOne({username: user_data.username});
        if(username_taken) {
            registration_msg.registered = false;
            registration_msg.failure_msg = `Username ${username_taken.username} is already taken`;
            return res.json({registration_msg: registration_msg});
        }

        const salt = await bcrypt.genSalt(5);
        const password_hash = await bcrypt.hash(user_data.password, salt);
        user_data.password = password_hash;
        
        const new_user = new User(user_data);
        const user_saved = await new_user.save();
        registration_msg.registered = true;
        registration_msg.username = user_saved.username;
        return res.json({registration_msg: registration_msg});
    } catch (error) {
        return res.json({error: modify_error(error)});
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
    let login_msg = {
        logged_in: '',
        username: '',
        token: '',
        failure_msg: ''
    }
    try {
        const user_data = _.pick(req.body, ['username', 'password']);
        
        const {error} = validate_data(user_data);
        if(error) {
            login_msg.logged_in = false;
            login_msg.failure_msg = error.message;
            return res.json({login_msg: login_msg});
        }

        const user_registered = await User.findOne({username: user_data.username});
        if(!user_registered) {
            login_msg.logged_in = false;
            login_msg.failure_msg = `User with username ${user_data.username} doesn't exist`;
            return res.json({login_msg: login_msg});
        }

        const password_correct = await bcrypt.compare(user_data.password, user_registered.password);
        if(!password_correct) {
            login_msg.logged_in = false;
            login_msg.failure_msg = `Username or password are incorrect`;
            return res.json({login_msg: login_msg});
        }
        
        const token = jwt.sign(user_data, config.get('jwtPrivateKey'), {expiresIn: '5m'});
        login_msg.logged_in = true;
        login_msg.username = user_data.username;
        login_msg.token = token;
        return res.cookie('token', token, {/* httpOnly: true, */ sameSite: 'none', secure: true}).json({login_msg: login_msg});

    } catch (error) {
        return res.json({error: modify_error(error)});
    }
})


function auth_cookie(req, res, next) {
    try {
        const token = req.cookies.token;
        const decoded_payload = jwt.verify(token, config.get('jwtPrivateKey'));
        req.user_data = _.pick(decoded_payload, ['username', 'password']);
        next()
    } catch (error) {
        return res.status(401).clearCookie('token').json({error: modify_error(error)});
    }
}

/* function auth_header(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded_payload = jwt.verify(token, config.get('jwtPrivateKey'));
        next()
    } catch (error) {
        return res.json({error: modify_error(error)});
    }
} */

function modify_error(err) {
    if(err.name =='MongooseError'
    || err.name =='CastError'
    || err.name =='DivergentArrayError'
    || err.name =='MissingSchemaError'
    || err.name =='DocumentNotFoundError'
    || err.name =='ValidatorError'
    || err.name =='ValidationError'
    || err.name =='MissingSchemaError'
    || err.name =='ObjectExpectedError'
    || err.name =='ObjectParameterError'
    || err.name =='OverwriteModelError'
    || err.name =='ParallelSaveError'
    || err.name =='StrictModeError'
    || err.name =='VersionError') {
        err.message = `Problem with the database. ${err.name}`;
    }
    const stringified_error = JSON.stringify(err, Object.getOwnPropertyNames(err));
    return JSON.parse(stringified_error)
}