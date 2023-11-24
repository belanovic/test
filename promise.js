const promise = new Promise((resolve, reject) => {
    resolve("vracena vrednost")
})
promise.then((value) => {
    console.log(value);
    return "vracena vrednost 1"
}).then((value1) => {
    console.log(value1);
    return new Promise((resolve, reject) => {resolve("vrednost Inner")})
}).then((valueInner) => {
    console.log(valueInner);
    return "vracena vrednost 2"
}).then((value2) => {
    console.log(value2);
})