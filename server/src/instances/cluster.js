import { spawn } from "child_process";

export class Cluster {
    constructor(instances) {
        this.instances = instances;
    }

    start() {
        const instanceUrls = this.instances.map(instance => instance.url);
        this.instances.forEach(instance => {
            const child = spawn("node", [
                "--experimental-specifier-resolution=node",
                "src/start-instance.js",
                instance.port,
                instance.clientUrl,
                JSON.stringify(instanceUrls.filter(url => url !== instance.url)),
            ]);

            // eslint-disable-next-line no-console
            console.log(`Spawned child ${child.pid}`);

            child.stdout.on("data", data => {
                // eslint-disable-next-line no-console
                const message = `${data}`.trim();
                console.log(`[${instance.port}] | ${message}`);
            });

            child.stderr.on("data", data => {
                // eslint-disable-next-line no-console
                console.error(`[${instance.port}] | ${data}`);
            });
        });
    }
}
