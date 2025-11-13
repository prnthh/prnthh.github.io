import FirstPersonController from "@/shared/firstperson/FirstPersonController";
import AnimatedModel from "@/shared/ped/HumanoidModel";

export default function Player() {
    return <FirstPersonController height={0.6} spawnPosition={[0, 5, 0]} cameraOffset={[0, 0.2, 1]}>
        <AnimatedModel
            scale={0.7}
            name={'bob'}
            basePath={"/models/human/onimilio/"}
            model={"rigged.glb"}
            animationOverrides={{
                walk: 'anim/walk.fbx',
                run: 'anim/run.fbx',
                jump: 'anim/jump.fbx',
                walkLeft: "/anim/walkLeft.fbx",
                lpunch: "/anim/lpunch.fbx",
                rpunch: "/anim/rpunch.fbx",
            }}
            // animation={animation}
            height={1.5}
        // lookTarget={lookTarget}
        // onActions={actions => {
        //     walkActionRef.current = actions["walk"] || null;
        //     walkLeftActionRef.current = actions["walkLeft"] || null;
        //     runActionRef.current = actions["run"] || null;
        // }}
        >
            {/* {children} */}
        </AnimatedModel>
    </FirstPersonController >
}