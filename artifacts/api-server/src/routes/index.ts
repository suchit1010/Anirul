import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import voiceRouter from "./voice";
import authRouter from "./auth";
import extractRouter from "./extract";
import documentsRouter from "./documents";
import storageRouter from "./storage";
import doctorRouter from "./doctor";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(voiceRouter);
router.use(authRouter);
router.use(extractRouter);
router.use(documentsRouter);
router.use(storageRouter);
router.use(doctorRouter);
router.use("/payments", paymentsRouter);

export default router;
