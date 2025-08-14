const drive = [
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
              2.1999999999999997,
              0.01,
              23.6
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
        ],
        "transform": {
          "position": null,
          "rotation": [
            null,
            1.565,
            null
          ],
          "scale": null
        }
      },
      {
        "id": "u6100s5xb",
        "name": "wall",
        "children": [],
        "components": [
          {
            "type": "meshStandardMaterial",
            "props": {
              "color": "#d6d6d6"
            }
          },
          {
            "type": "boxGeometry",
            "args": [
              0.09999999999999998,
              1.7000000000000002,
              23.5
            ]
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
            0.04102985954241767,
            0.8601955452795274,
            -1.095326287804211
          ],
          "rotation": [
            null,
            1.565,
            null
          ]
        }
      }
    ],
    "components": []
  }
];

export default drive;