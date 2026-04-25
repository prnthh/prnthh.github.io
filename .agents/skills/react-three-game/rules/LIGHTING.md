# Lighting & Shadows

The built-in light components cover most authored lighting setups.

## Built-in light shadow controls

`DirectionalLight`, `SpotLight`, and `PointLight` expose shadow settings through component properties:

- `castShadow`
- `shadowMapSize`
- `shadowBias`
- `shadowNormalBias`
- `shadowAutoUpdate`
- `shadowCameraNear`
- `shadowCameraFar`

Additional light-specific props:

- `DirectionalLight`: `targetOffset`, frustum bounds
- `SpotLight`: `targetOffset`, `angle`, `penumbra`, optional texture `map`
- `PointLight`: `distance`, `decay`

## Large scene guidance

For large scenes:

- Enable `castShadow` on the lights that actually shape the scene.
- Lean on one main shadow-casting light for the primary shadow pass.
- Set `shadowAutoUpdate: false` once lighting and static geometry have settled.
- Bump `shadowMapSize` when resolution is the bottleneck.
- Tune `shadowBias` and `shadowNormalBias` first; reach for a larger map size second.

## One-shot shadow refreshes

The built-in light components already call `shadow.needsUpdate = true` when shadow-related props change. A one-shot refresh just means updating a relevant light property through the `Scene` API.

Typical pattern:

```tsx
editorRef.current?.update('sun', (node) => ({
	...node,
	components: {
		...node.components,
		directionalLight: {
			type: 'DirectionalLight',
			properties: {
				...node.components?.directionalLight?.properties,
				shadowAutoUpdate: false,
				shadowBias: node.components?.directionalLight?.properties?.shadowBias ?? 0,
			},
		},
	},
}));
```

If you are driving a custom R3F light ref directly, the manual pattern still works:

```tsx
directionalLight.current.shadow.autoUpdate = false;
directionalLight.current.shadow.needsUpdate = true;
```

## Practical defaults

- `DirectionalLight` for the main outdoor shadow caster.
- `SpotLight` for focused pools of light and authored targets.
- `PointLight` works well when shadows stay off; enable shadows on it sparingly.
- `AmbientLight` lifts dark scenes (it is non-directional and shadow-free by design).

## Shadow authoring notes

- Meshes contribute to shadow casting when `castShadow` is set.
- Meshes show received shadows when `receiveShadow` is set.
- `Geometry` primary content in `PrefabRoot` is rendered with both enabled.
- Imported models are worth a quick visual check, especially when mixing instancing and custom materials.
