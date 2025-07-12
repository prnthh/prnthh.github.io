const presets = {
    "flat": [
        {
            "id": "lxwo6ise0",
            "name": "Root",
            "children": [
                {
                    "id": "ctpqzyj9c",
                    "name": "ground",
                    "children": [],
                    "components": [
                        {
                            "type": "boxGeometry",
                            "args": [
                                10,
                                0.1,
                                10
                            ]
                        },
                        {
                            "type": "meshStandardMaterial",
                            "props": {
                                "color": "#04ff00"
                            }
                        }
                    ],
                    "transform": {
                        "position": [
                            0,
                            -0.05064781530774232,
                            0
                        ]
                    }
                }
            ],
            "components": []
        }
    ],
    jump: [
        {
          "id": "wx1mig2q2",
          "name": "Root",
          "children": [
            {
              "id": "q2objc0mj",
              "name": "Node-q2objc0mj",
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
                    "color": "#595959"
                  }
                },
                {
                  "type": "physics",
                  "props": {
                    "type": "fixed"
                  }
                }
              ]
            },
            {
              "id": "ktm3pf2kd",
              "name": "Node-q2objc0mj",
              "children": [],
              "components": [
                {
                  "type": "boxGeometry",
                  "args": [
                    1.5999999999999996,
                    0.01,
                    10
                  ]
                },
                {
                  "type": "meshStandardMaterial",
                  "props": {
                    "color": "#595959"
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
                "position": [
                  0,
                  0,
                  -9.584507802742628
                ],
                "rotation": [
                  null,
                  0,
                  null
                ]
              }
            },
            {
              "id": "cpsz7cnol",
              "name": "Node-q2objc0mj",
              "children": [],
              "components": [
                {
                  "type": "boxGeometry",
                  "args": [
                    1.5999999999999996,
                    0.01,
                    10
                  ]
                },
                {
                  "type": "meshStandardMaterial",
                  "props": {
                    "color": "#595959"
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
                "position": [
                  4.660070344655564,
                  0,
                  -13.690566897315659
                ],
                "rotation": [
                  null,
                  -1.6,
                  null
                ]
              }
            }
          ],
          "components": []
        }
      ]
}

export default presets;