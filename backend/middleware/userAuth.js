import jwt, { decode } from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';

export function userAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided or incorrect format" });
    }
    const token = authHeader.split(" ")[1]; 
    console.log(token);
    const decoded = jwt.verify(token, JWT_SECRET);

    if(decoded.userId){
        console.log(req.body);
        req.userId = decoded.userId;
        next();
    }
    else{
        return res.status(401).json({ error: "Invalid token" });
    }
}
