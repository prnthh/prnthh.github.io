import {
    trait,
    relation,
    createWorld,
    createActions,
} from "koota";

/* ======================================================
   ECS — Traits & Relations
====================================================== */

const Position = trait({ x: 0, y: 0 });
const Speed = trait({ value: 1 });

const Station = trait(); // tag
const Rocket = trait();  // tag

// Each rocket can target ONE station
const Targeting = relation({ exclusive: true });

/* ======================================================
   ECS — World
====================================================== */

const world = createWorld();

/* ======================================================
   ECS — Actions
====================================================== */

const actions = createActions((world) => ({
    spawnStation: (x: number, y: number) =>
        world.spawn(Position({ x, y }), Station()),

    spawnRocket: (x: number, y: number) =>
        world.spawn(
            Position({ x, y }),
            Speed({ value: 1 }),
            Rocket()
        ),

    tick: () => {
        const stations = world.query(Station);

        world
            .query(Position, Speed, Rocket)
            .updateEach(([pos, speed], rocket) => {
                if (stations.length === 0) return;

                const target = rocket.targetFor(Targeting);

                if (!target) {
                    rocket.add(
                        Targeting(
                            stations[Math.floor(Math.random() * stations.length)]
                        )
                    );
                    return;
                }

                const targetPos = target.get(Position);
                if (!targetPos) {
                    rocket.remove(Targeting('*'));
                    return;
                }

                const dx = targetPos.x - pos.x;
                const dy = targetPos.y - pos.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 2) {
                    rocket.remove(Targeting('*'));
                    return;
                }

                pos.x += (dx / dist) * speed.value;
                pos.y += (dy / dist) * speed.value;

            });
    },


    clear: () => {
        world.query(Position).forEach((e) => e.destroy());
    },
}));

export { world, actions, Position, Speed, Station, Rocket, Targeting };