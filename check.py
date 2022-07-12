import os
import yaml

root_dir = os.path.dirname(os.path.abspath(__file__))

dst_filename = input()

if dst_filename.strip() == "":
    max_mtime = 0

    for filename in os.listdir(root_dir):
        path = os.path.join(root_dir, filename)
        if os.path.isfile(path) and filename.endswith(".yml"):
            mtime = os.path.getmtime(path)
            if mtime > max_mtime:
                max_mtime, dst_filename = mtime, filename

dst_path = os.path.join(root_dir, dst_filename)
dst_pure_filename = os.path.splitext(dst_filename)[0]

print("-------- CONFIG --------")
print(dst_path)
print()

with open(dst_path, encoding="utf-8") as f:
    config = yaml.load(f, yaml.FullLoader)
    print("-------- JSON --------")
    print(config)
    print()

flag = False


def error(msg):
    global flag
    print("-------- ERROR --------")
    print(msg)
    print()
    flag = True


def warn(msg):
    global flag
    print("-------- WARNING --------")
    print(msg)
    print()
    flag = True


keys = ["title", "intro", "tutorial", "entry", "link"]
for k in keys:
    if k not in config:
        error(f"Key '{k}': not in config")
    elif not isinstance(config[k], str):
        error(f"Value of '{k}': type error")
    elif config[k].strip() == "":
        error(f"Value of '{k}': is empty")

for k in config:
    if k not in keys:
        error(f"Key '{k}': unexpected key")

entry_path = os.path.join(
    root_dir, dst_pure_filename, config["entry"])
if not os.path.exists(entry_path):
    error(f"Entry file '{entry_path}' not found")

for filename in os.listdir(root_dir):
    path = os.path.join(root_dir, filename)
    if os.path.isfile(path) and filename.endswith(".yml") and filename != dst_filename:
        cur_path = os.path.join(root_dir, filename)
        with open(cur_path, encoding="utf-8") as f:
            cur_config = yaml.load(f, yaml.FullLoader)
            try:
                if cur_config["link"].find(dst_pure_filename) != -1 or \
                        cur_config["link"].find(dst_pure_filename) != -1:
                    warn(f"May be the same as '{cur_path}'")
            except:
                pass

if not flag:
    print("-------- OK --------")
    print()
