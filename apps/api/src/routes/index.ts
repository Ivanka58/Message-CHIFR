import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import messagesRouter from "./messages.js";
import adminRouter from "./admin.js";
import pushRouter from "./push.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(messagesRouter);
router.use(adminRouter);
router.use(pushRouter);

export default router;
