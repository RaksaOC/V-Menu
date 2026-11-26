"use client";

import type { ComponentType } from "react";
import type { SceneId } from "@/content/tour";
import { HealthScene, SecurityScene, TryScene } from "./OpsScenes";
import { BeforeScene, FlowScene, IntroScene, RolesScene } from "./StoryScenes";
import { ArchitectureScene, OrderScene, OwnershipScene } from "./SystemScenes";

export const SCENES: Record<SceneId, ComponentType> = {
    intro: IntroScene,
    roles: RolesScene,
    flow: FlowScene,
    before: BeforeScene,
    architecture: ArchitectureScene,
    ownership: OwnershipScene,
    order: OrderScene,
    security: SecurityScene,
    health: HealthScene,
    try: TryScene,
};
