const presets = {
  "flat": [
    {
      "id": "zwdcat6g3",
      "name": "Root",
      "children": [
        {
          "id": "kdq9whzkx",
          "name": "floor",
          "children": [],
          "components": [
            {
              "type": "boxGeometry",
              "args": [
                10,
                0.01,
                10
              ]
            },
            {
              "type": "meshStandardMaterial",
              "props": {
                "color": "#ffd129"
              }
            },
            {
              "type": "physics",
              "props": {
                "type": "fixed"
              }
            }
          ]
        }
      ],
      "components": []
    }
  ],
  drive: [
  {
    "id": "zwdcat6g3",
    "name": "Root",
    "children": [
      {
        "id": "7qhl5spkj",
        "name": "burnin_rubber_4_city.glb",
        "children": [],
        "components": [
          {
            "type": "model",
            "filename": "burnin_rubber_4_city.glb"
          },
          {
            "type": "physics",
            "props": {
              "type": "fixed"
            }
          }
        ],
        "transform": {
          "position": [
            -898.323828568215,
            -34.07424686128641,
            1359.7209057722787
          ],
          "rotation": [
            0,
            0,
            0
          ],
          "scale": 0.7999999999999999
        }
      }
    ],
    "components": []
  }
]
}

export default presets;