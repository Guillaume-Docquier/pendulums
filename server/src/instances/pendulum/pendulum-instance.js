// eslint-disable-next-line import/no-unresolved
import got from "got";
import { StatusCodes } from "http-status-codes";

import { Instance } from "../instance";
import { MS_PER_SECONDS } from "../../constants";
import { PendulumSimulation } from "./pendulum-simulation";

const PAUSE_AFTER_COLLISION = 5_000;

export class PendulumInstance extends Instance {
    constructor(port, clientUrl) {
        super(port, clientUrl);

        this.restartMessages = null;
        this.simulation = new PendulumSimulation(
            MS_PER_SECONDS / 30,
            this.getOtherPendulums.bind(this),
            this.onCollision.bind(this),
        );
    }

    setupRoutes(app) {
        app.get("/pendulum", this.getPendulum.bind(this));
        app.post("/start", this.startSimulation.bind(this));
        app.post("/pause", this.pauseSimulation.bind(this));
        app.post("/reset", this.resetSimulation.bind(this));

        app.post("/collision", this.handleCollision.bind(this));
        app.post("/restart", this.handleRestartSequence.bind(this));
    }

    getPendulum(req, res) {
        const { state } = this.simulation;
        if (!state) {
            return res.sendStatus(StatusCodes.PRECONDITION_REQUIRED);
        }

        console.log(state.status);

        return res.json(state);
    }

    startSimulation(req, res) {
        this.simulation.start(req.body, this.neighborUrls);

        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Simulation started`);
        return res.sendStatus(StatusCodes.CREATED);
    }

    pauseSimulation(req, res) {
        this.simulation.pause();

        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Simulation paused`);
        return res.sendStatus(StatusCodes.OK);
    }

    resetSimulation(req, res) {
        this.simulation.reset();

        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Simulation reset`);
        return res.json(this.simulation.state);
    }

    handleCollision() {
        this.simulation.initRestart();
        if (!this.restartMessages) {
            this.restartMessages = this.getRestartMessages();
            setTimeout(() => {
                this.neighborUrls.forEach(neighborUrl => got.post(`${neighborUrl}/restart`, { json: { id: this.url } }));
            }, PAUSE_AFTER_COLLISION);

            // eslint-disable-next-line no-console
            console.log(`[${new Date().toISOString()}] Collision reported`);
        }
    }

    handleRestartSequence(req) {
        this.restartMessages[req.body.id] = true;
        if (Object.values(this.restartMessages).every(isTrue => isTrue)) {
            this.simulation.restart();
            this.restartMessages = null;

            // eslint-disable-next-line no-console
            console.log(`[${new Date().toISOString()}] Simulation restarted`);
        }
    }

    async getOtherPendulums() {
        const pendulumRequests = this.neighborUrls.map(neighborUrl => got.get(`${neighborUrl}/pendulum`).json().catch(() => null));
        const pendulums = await Promise.all(pendulumRequests);

        return pendulums.filter(pendulum => pendulum && pendulum.bobPosition);
    }

    onCollision() {
        this.neighborUrls.forEach(neighborUrl => got.post(`${neighborUrl}/collision`).catch(() => null));
        this.handleCollision();
    }

    getRestartMessages() {
        return this.neighborUrls.reduce((messages, neighborUrl) => {
            // eslint-disable-next-line no-param-reassign
            messages[neighborUrl] = false;

            return messages;
        }, {});
    }
}
