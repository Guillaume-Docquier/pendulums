import { PendulumInstance } from "./instances";

// argv
// 0 - node
// 1 - file
// 2 - arg #1
const [_node, _file, port, client, neighborUrls] = process.argv;

const instance = new PendulumInstance(port, client);
instance.updateNeighbors(JSON.parse(neighborUrls));
instance.start();
