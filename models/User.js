// A schema in Mongoose defines the structure, rules, and defaults for a document in a MongoDB collection.
// MongoDB by itself is schema-less, meaning you can insert any kind of data. But that flexibility can cause problems, like inconsistent data, missing fields, or invalid types.

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['superuser', 'admin', 'approver', 'user'],
        default: 'user',
    },
    position: String,
    team: String,
    office: String,
    country: String,
    wfhWeekly: {type: Number, default: 1},
    leaveCounts: {
    sickLeave: { type: Number, default: 15 },
    timeOff: { type: Number, default: 15 },
    },
    employmentDate: Date,
    isActive: {
        type: Boolean,
        default: true,
    }
}, 
{
    timestamps: true,
});

const User = mongoose.model('User', userSchema, 'user');

export default User;