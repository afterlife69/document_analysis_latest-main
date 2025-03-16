import {addSubject} from "../controllers/addSubject.js";
import {getUserSubjects} from "../controllers/getUserSubjects.js";
import { userAuthMiddleware } from "../middleware/userAuth.js";
import express from 'express';

const router = express.Router();

router.post('/',userAuthMiddleware, addSubject);
router.get('/',userAuthMiddleware, getUserSubjects);

export default router;