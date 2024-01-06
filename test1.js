
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const config = require('config');

/* try {
    console.log(config.get('jjwtPrivateKey'));
    console.log(app.get('env'));
    console.log(process.env.NODE_ENV);
} catch(err) {
    console.log(_.pick(err, ['message']));
    for(let prom in err) {
        console.log('prom')
    }
} */
console.log(config.get('host'))

async function hash(password) {
    const salt = await bcrypt.genSalt(5);
    console.log(salt);
    const hashed_password = await bcrypt.hash(password, salt);
    console.log(hashed_password);
}
/* hash('3333'); */

/* const token = jwt.sign({username: 'Goran', password: '1234'}, config.get('jwtPrivateKey'));
console.log(token);
const decoded_payload = jwt.verify(token, config.get('jwtPrivateKey'));
console.log(decoded_payload); */


/* process.env.TZ = "Europe/Belgrade"; */
/* process.env.TZ = "America/Montreal"; */

const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
}
console.log(new Date());
console.log(new Date().toLocaleString('sr-RS', options))
console.log(new Date().toLocaleDateString('sr-RS'))
console.log(new Date().toLocaleTimeString('sr-RS'))