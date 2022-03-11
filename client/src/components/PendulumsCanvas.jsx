import React, { useCallback, useEffect, useReducer, useState } from "react";
import { getMouseCoords, getMouseDelta } from "utils";
import { Canvas } from "components/Canvas";
import { SERVER_URL, PENDULUM_ENDPOINT, REFRESH_PERIOD } from "constants";
import { Circle, Line, Pendulum } from "./shapes";
import { Poller } from "./Poller";
import { SimulationStates } from "./simulation-states";
import { StartButton, PauseButton, ResetButton, WindCompass } from "./controls";

const PIVOT_RADIUS = 6;
const PENDULUM_RADIUS = 20;
const ROD_WIDTH = 4;
const BUTTOM_BOTTOM_MARGIN = 15;
const PENDULUM_COUNT = 5;
const PENDULUM_INDEXES = Array.from({ length: PENDULUM_COUNT }, (_, i) => i + 1);

function reducer(state, action) {
    switch(action.type) {
        case "pendulumUpdated":
            const servers = {
                ...state.servers,
                [action.server]: action.newState,
            };

            let newState = state.state;
            const serverStates = Object.values(servers);
            if (new Set(serverStates).size === 1) {
                newState = serverStates[0];
            }

            return {
                state: newState,
                interactionsEnabed: newState === SimulationStates.STOPPED,
                servers,
            };
        case "setAllStates":
            return {
                state: action.newState,
                interactionsEnabed: action.newState === SimulationStates.STOPPED,
                servers: {
                    ...state.servers,
                    ...Object.keys(state.servers).reduce((pStates, server) => {
                        pStates[server] = action.newState;

                        return pStates;
                    }, {}),
                }
            }
        default:
            return state;
    }
}

export const PendulumsCanvas = ({ width, height, ...canvasProps}) => {
    const [anchor] = useState(new Line(
        new Circle(15, 15),
        new Circle(width - 15, 15),
        4
    ));
    const [pendulums] = useState(PENDULUM_INDEXES.map(i =>
        ({
            shape: new Pendulum(
                new Circle(i * width / 6, anchor.start.y, PIVOT_RADIUS, { dragAxis: { x: true } }),
                new Circle(i * width / 6, height / 2, PENDULUM_RADIUS + 10 * (i - 1)),
                ROD_WIDTH
            ),
            server: `${SERVER_URL}:300${i}`,
        })
    ));
    const [startButton] = useState(StartButton(1 * width / 4.5, height - BUTTOM_BOTTOM_MARGIN, pendulums, newState => dispatch({ type: "setAllStates", newState })));
    const [pauseButton] = useState(PauseButton(2 * width / 4.5, height - BUTTOM_BOTTOM_MARGIN, pendulums, newState => dispatch({ type: "setAllStates", newState })));
    const [resetButton] = useState(ResetButton(3 * width / 4.5, height - BUTTOM_BOTTOM_MARGIN, pendulums, newState => dispatch({ type: "setAllStates", newState })));
    const [windCompass] = useState(WindCompass(width - 75, height - 75, pendulums));

    const [pendulumStates, dispatch] = useReducer(reducer, {
        state: SimulationStates.STOPPED,
        interactionsEnabed: true,
        servers: pendulums.reduce((pStates, pendulum) => {
            pStates[pendulum.server] = SimulationStates.STOPPED;

            return pStates;
        }, {})
    });

    useEffect(() => {
        startButton.disabled = [SimulationStates.STARTED, SimulationStates.RESTARTING].includes(pendulumStates.state);
        pauseButton.disabled = pendulumStates.state !== SimulationStates.STARTED;
        resetButton.disabled = pendulumStates.state === SimulationStates.STOPPED;
    }, [pendulumStates.state, startButton, pauseButton, resetButton])

    const draw = useCallback(ctx => {
        anchor.render(ctx);
        pendulums.forEach(pendulum => pendulum.shape.render(ctx));
        startButton.render(ctx);
        pauseButton.render(ctx);
        resetButton.render(ctx);
        windCompass.render(ctx);
    }, [anchor, pendulums, startButton, pauseButton, resetButton, windCompass]);

    const mouseDown = useCallback(e => {
        const position = getMouseCoords(e);

        if (pendulumStates.interactionsEnabed) {
            pendulums.forEach(pendulum => pendulum.shape.mouseDown(position));
            windCompass.mouseDown(position);
        }

        startButton.mouseDown(position);
        pauseButton.mouseDown(position);
        resetButton.mouseDown(position);

    }, [pendulumStates.interactionsEnabed, pendulums, startButton, pauseButton, resetButton, windCompass]);

    const mouseMove = useCallback(e => {
        const position = getMouseCoords(e);
        const delta = getMouseDelta(e);

        if (pendulumStates.interactionsEnabed) {
            pendulums.forEach(pendulum => pendulum.shape.mouseMove(position, delta));
            windCompass.mouseMove(position, delta);
        }

        startButton.mouseMove(position, delta);
        pauseButton.mouseMove(position, delta);
        resetButton.mouseMove(position, delta);
    }, [pendulumStates.interactionsEnabed, pendulums, startButton, pauseButton, resetButton, windCompass]);

    const mouseUp = useCallback(e => {
        const position = getMouseCoords(e);

        if (pendulumStates.interactionsEnabed) {
            pendulums.forEach(pendulum => pendulum.shape.mouseUp(position));
            windCompass.mouseUp(position);
        }

        startButton.mouseUp(position);
        pauseButton.mouseUp(position);
        resetButton.mouseUp(position);
    }, [pendulumStates.interactionsEnabed, pendulums, startButton, pauseButton, resetButton, windCompass]);

    console.log("render");

    return (
        <>
            {pendulums.map(({ shape, server }) => (
                <Poller
                    key={server}
                    shape={shape}
                    url={`${server}/${PENDULUM_ENDPOINT}`}
                    pollingPeriod={REFRESH_PERIOD}
                    poll={pendulumStates.servers[server] !== SimulationStates.STOPPED}
                    onPoll={json => {
                        shape.bob.x = json.bobPosition.x;
                        shape.bob.y = json.bobPosition.y;
                        dispatch({ type: "pendulumUpdated", server, newState: json.status });
                    }}
                />
            ))}
            <Canvas draw={draw} onMouseDown={mouseDown} onMouseMove={mouseMove} onMouseUp={mouseUp} width={width} height={height} {...canvasProps} />
        </>
    );
};
