import { CLIENT_URL } from "./constants";
import { Cluster, PendulumInstance } from "./instances";

const cluster = new Cluster([
    new PendulumInstance(3001, CLIENT_URL),
    new PendulumInstance(3002, CLIENT_URL),
    new PendulumInstance(3003, CLIENT_URL),
    new PendulumInstance(3004, CLIENT_URL),
    new PendulumInstance(3005, CLIENT_URL),
]);

cluster.start();
