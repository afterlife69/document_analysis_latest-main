import User from "../models/user.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

export const signup = async (req, res) => {
    try {
        const { username, firstName, lastName, email, password } = req.body;
        console.log(`username: ${username}, firstName: ${firstName}, lastName: ${lastName}, email: ${email}, password: ${password}`);
        
        const user = new User({ username, firstName, lastName, email, password });
        await user.save();
        
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.log(err);
        
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.verifyPassword(password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};
