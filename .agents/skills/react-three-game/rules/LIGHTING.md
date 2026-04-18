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

- Keep `castShadow` enabled only on the lights that matter.
- Use one main shadow-casting light for the primary shadow pass.
- Set `shadowAutoUpdate: false` once lighting and static geometry stop changing.
- Increase `shadowMapSize` only when resolution is the actual problem.
- Tune `shadowBias` and `shadowNormalBias` before increasing map size.

## One-shot shadow refreshes

The built-in light components already call `shadow.needsUpdate = true` when shadow-related props change. That means a one-shot refresh can be triggered by updating a relevant light property through prefab data or the prefab store.

Typical pattern:

```tsx
editorRef.current?.store.getState().updateNode('sun', (node) => ({
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

If you are using a custom R3F light ref, this manual pattern is still valid:

```tsx
directionalLight.current.shadow.autoUpdate = false;
directionalLight.current.shadow.needsUpdate = true;
```

## Practical defaults

- Use `DirectionalLight` for the main outdoor shadow caster.
- Use `SpotLight` for focused pools of light and authored targets.
- Use `PointLight` sparingly when shadows are enabled.
- Use `AmbientLight` to lift dark scenes, but it does not cast shadows.

## Shadow authoring notes

- Only meshes with `castShadow` contribute to shadow casting.
- Only meshes with `receiveShadow` show received shadows.
- `Geometry` primary content in `PrefabRoot` is rendered with both enabled.
- Imported models should still be checked visually, especially when mixing instancing and custom materials.
