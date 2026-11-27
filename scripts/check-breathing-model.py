"""Run with Blender on assets/models/polar-h10-worn.blend."""
from statistics import mean

import bpy
from mathutils.kdtree import KDTree

scene = bpy.context.scene
body = next(obj for obj in scene.objects if obj.name.startswith("Avatar"))
tracers = [obj for obj in scene.objects if obj.name.startswith("Air ")]
assert tracers, "Missing airflow particles"

# Follow the same skin vertices in both poses. World Y points posteriorly.
scene.frame_set(scene.frame_start)
rest_body = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
tree = KDTree(len(rest_body.data.vertices))
for vertex in rest_body.data.vertices:
    tree.insert(rest_body.matrix_world @ vertex.co, vertex.index)
tree.balance()
landmarks = {
    "sternum": (0, -.14, 1.245),
    "left ribs": (.145, -.040, 1.165),
    "right ribs": (-.145, -.040, 1.165),
    "left shoulder": (.150, -.029, 1.366),
    "right shoulder": (-.150, -.029, 1.366),
}
vertices = {name: tree.find(point)[1] for name, point in landmarks.items()}
rest = {name: rest_body.matrix_world @ rest_body.data.vertices[i].co for name, i in vertices.items()}
scene.frame_set(scene.timeline_markers["Exhale • outward flow"].frame)
peak_body = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
travel = {name: peak_body.matrix_world @ peak_body.data.vertices[i].co - rest[name]
          for name, i in vertices.items()}
sternum = travel["sternum"]
sideways = max(abs(travel[name].x) for name in ("left ribs", "right ribs"))
assert -sternum.y > 3 * sideways and sternum.z > 2 * sideways, travel
for name in ("left shoulder", "right shoulder"):
    assert 0 < travel[name].z < sternum.z and travel[name].z > abs(travel[name].x), travel
print("Sternal excursion, forward / up (mm):", -1000 * sternum.y, 1000 * sternum.z)
print("Lateral rib excursion (mm):", 1000 * sideways)
print("Shoulder lift, left / right (mm):", *(1000 * travel[n].z for n in ("left shoulder", "right shoulder")))

# Check the evaluated particles in anatomical regions through the whole breath.
# The same point must become visible again on its return towards the mouth.
for phase in ((1, 43), (43, 109)):
    outside, mouth, throat, chest = [], [], [], []
    for frame in range(*phase):
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        for tracer in tracers:
            particle = tracer.evaluated_get(graph)
            _, y, z = particle.matrix_world.translation
            alpha = particle.color[3]
            if y < -.16:
                outside.append(alpha)
            elif -.125 < y < -.098 and z > 1.49:
                mouth.append(alpha)
            elif 1.40 < z < 1.43:
                throat.append(alpha)
            elif z < 1.29:
                chest.append(alpha)
    assert min(outside) > .9 and max(chest) < .35
    assert all(min(near) > max(far) for near, far in ((outside, mouth), (mouth, throat), (throat, chest)))
    print("Mean opacity, outside / mouth / throat / chest:", *(round(mean(r), 2) for r in (outside, mouth, throat, chest)))
