import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';

import { Vector2 } from 'three';

type SplatStack = {
    mouseX: number;
    mouseY: number;
    velocityX: number;
    velocityY: number;
};

export const usePointer = ({ force }: { force: number }) => {
    const size = useThree((three) => three.size);

    const splatStack: SplatStack[] = useRef([]).current;

    const lastMouse = useRef<Vector2>(new Vector2());
    const hasMoved = useRef<boolean>(false);
    const isDown = useRef<boolean>(false);

    const onPointerMove = useCallback(
        (event: { x: number; y: number }) => {
            if (!isDown.current) {
                lastMouse.current.set(event.x, event.y);
                hasMoved.current = false;
                return;
            }

            const deltaX = event.x - lastMouse.current.x;
            const deltaY = event.y - lastMouse.current.y;

            if (!hasMoved.current) {
                hasMoved.current = true;
                lastMouse.current.set(event.x, event.y);
                return;
            }

            lastMouse.current.set(event.x, event.y);

            const dx = deltaX;
            const dy = deltaY;
            const speed = Math.sqrt(dx * dx + dy * dy);

            let dirX = 0;
            let dirY = 0;
            if (speed > 0.0001) {
                dirX = dx / speed;
                dirY = dy / speed;
            }

            const offset = Math.min(60, Math.max(8, speed * 0.5));
            const spawnX = event.x - dirX * offset;
            const spawnY = event.y - dirY * offset;

            const lateralFactor = 0.5;
            const backwardFactor = 0.25;
            const lateral = Math.max(1, speed) * lateralFactor;
            const backward = Math.max(0.5, speed) * backwardFactor;

            let perpX = -dirY;
            let perpY = dirX;
            if (Math.abs(perpX) < 1e-6 && Math.abs(perpY) < 1e-6) {
                perpX = 1;
                perpY = 0;
            }

            const side = Math.random() > 0.5 ? 1 : -1;

            const velX = (perpX * lateral * side - dirX * backward) * force;
            const velY = -((perpY * lateral * side - dirY * backward) * force);

            const splatInfo = {
                mouseX: spawnX / size.width,
                mouseY: 1.0 - spawnY / size.height,
                velocityX: velX,
                velocityY: velY,
            };

            splatStack.push(splatInfo);
        },
        [force, size.height, size.width, splatStack],
    );

    const onPointerDown = useCallback((event: { x: number; y: number }) => {
        isDown.current = true;
        hasMoved.current = false;
        lastMouse.current.set(event.x, event.y);
    }, []);

    const onPointerUp = useCallback(() => {
        isDown.current = false;
        hasMoved.current = false;
    }, []);

    useEffect(() => {
        addEventListener('pointermove', onPointerMove);
        addEventListener('pointerdown', onPointerDown);
        addEventListener('pointerup', onPointerUp);
        addEventListener('pointerleave', onPointerUp);
        addEventListener('pointercancel', onPointerUp);

        return () => {
            removeEventListener('pointermove', onPointerMove);
            removeEventListener('pointerdown', onPointerDown);
            removeEventListener('pointerup', onPointerUp);
            removeEventListener('pointerleave', onPointerUp);
            removeEventListener('pointercancel', onPointerUp);
        };
    }, [onPointerMove, onPointerDown, onPointerUp]);

    return splatStack;
};
