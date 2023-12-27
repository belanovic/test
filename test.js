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
    genre: String,
    year: Number
})

const Film = mongoose.model('Film', schema_film);


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

app.get('/allFilms', auth_cookie, async (req, res) => {

    function QueryMsg(isSuccess, result) {
        if(isSuccess) {
            this.isSuccess = true;
            this.filmsFound = result;
        }
        if(!isSuccess) {
            this.isSuccess = false;
            this.failureMsg = result;
        }
    }

    try {
        const all_films = await Film.find()
        return res.json({queryMsg: new QueryMsg(true, all_films)});
    } catch (error) {
        res.json({error: modify_error(error)})
    }

})
app.post('/findFilm', auth_cookie, async (req, res) => {

    function QueryMsg(isSuccess, result) {
        this.isSuccess = isSuccess;
        if(isSuccess) {
            this.filmFound = result;
        }
        if(!isSuccess) {
            this.failureMsg = result;
        }
    }

    try {
        const film = await Film.findOne({title: req.body.title})
        if(film) {
            return res.json({queryMsg: new QueryMsg(true, film)})
        } else {
            return res.json({queryMsg: new QueryMsg(false, `The movie with the title ${req.body.title} wasn't found`)});
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


app.post('/postFilm', auth_cookie, async (req,res) => {
    let postMsg = {
        isSaved: '',
        filmSaved: '',
        failureMsg: ''
    }
    function PostMsg(isSuccess, result) {
        this.isSuccess = isSuccess;
        if(isSuccess) {
            this.filmSaved = result;
        }
        if(!isSuccess) {
            this.failureMsg = result;
        }
    }
    try { 
        const filmData = _.pick(req.body, ['title', 'genre', 'year']);

        const {error} = validateData('film', filmData);
        if(error) {
            return res.json({postMsg: new PostMsg(false, error.message)});
        }
        const alreadyPosted = await Film.findOne({title: filmData.title});
        if(alreadyPosted) {
            return res.json({postMsg: new PostMsg(false, `Movie with the title ${alreadyPosted.title} is already in the database`)})
        }
        const newFilm = new Film(filmData);
        const filmSaved = await newFilm.save();
        return res.json({postMsg: new PostMsg(true, filmSaved)})

    } catch (error) {
        res.json({error: modify_error(error)});
    }
})


app.post('/register', async (req, res) => {
    let registration_msg = {
        registered: '',
        username: '',
        failureMsg: ''
    }
    try {
        let user_data = _.pick(req.body, ['username', 'password']);
        
        const {error} = validateData('user', user_data);;
        if(error) {
            registration_msg.registered = false;
            registration_msg.failureMsg = error.message;
            return res.json({registration_msg: registration_msg});
        }
        const alreadyPosted = await User.findOne({username: user_data.username});
        if(alreadyPosted) {
            registration_msg.registered = false;
            registration_msg.failureMsg = `Username ${alreadyPosted.username} is already taken`;
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



app.post('/login', async (req, res) => {
    let login_msg = {
        logged_in: '',
        username: '',
        token: '',
        failureMsg: ''
    }
    try {
        const user_data = _.pick(req.body, ['username', 'password']);
        
        const {error} = validateData('user', user_data);;
        if(error) {
            login_msg.logged_in = false;
            login_msg.failureMsg = error.message;
            return res.json({login_msg: login_msg});
        }

        const user_registered = await User.findOne({username: user_data.username});
        if(!user_registered) {
            login_msg.logged_in = false;
            login_msg.failureMsg = `User with username ${user_data.username} doesn't exist`;
            return res.json({login_msg: login_msg});
        }

        const password_correct = await bcrypt.compare(user_data.password, user_registered.password);
        if(!password_correct) {
            login_msg.logged_in = false;
            login_msg.failureMsg = `Username or password are incorrect`;
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

function validateData(type, user_data) {;
    let joi_schema;
    if(type == 'user') {
        joi_schema = Joi.object({
            username: Joi.string().min(3).max(15).required(),
            password: Joi.string().min(3).max(15).required()
        })
    } else if(type == 'film')  {
        joi_schema = Joi.object({
            title: Joi.string().min(1).max(155).required(),
            genre: Joi.string().min(2).max(30).required(),
            year: Joi.number().integer().min(0).max(2024).required()
        })
    } else {
        return
    }
    return joi_schema.validate(user_data);
}

/* function QueryMsg(itemName, isSuccess, result) {
    if(typeof itemName !== 'string' || typeof isSuccess !== 'boolean') {
        console.log('Parameters of the query message function are incorrect')
        throw new Error('There seems to be a problem with the server code');
    }
    if(isSuccess === true) {
        this.isSuccess = true;
        this[`${itemName}Found`] = result;
    }
    if(isSuccess === false) {
        this.isSuccess = false;
        this.failureMsg = result;
    }
} */

