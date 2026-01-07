const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true
    },
    projectsUrl : {
        type : String,
        required : true
    },
    envVariables : {
        type : [String]
    },
    createdAt : {
        type : Date, 
        default : Date.now
    }
} , { timestamps: true })

const User = mongoose.model("User", userSchema)

module.exports = User;