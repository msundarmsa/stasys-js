import os
import subprocess
import shutil
import sys


# clean dependency output
def clean_dep(dep_path):
    dep_path = dep_path.strip()
    return f'{dep_path.split(".dylib")[0]}.dylib'


# depth first search of dependencies and copy to libs folder
def dependency_walk(dep_path, arch, libs_folder, brew_folder):
    # get sub dependencies of current dependency
    sub_deps = subprocess.run(['otool', '-L', dep_path],
                              stdout=subprocess.PIPE)
    sub_deps = sub_deps.stdout.decode('utf-8').split('\n')

    # first and second output is usually the dependency's own name
    for sub_dep in sub_deps[2:]:
        sub_dep = clean_dep(sub_dep)
        if sub_dep.startswith(f'{brew_folder}/opt') and \
           'libopencv' not in sub_dep:
            shutil.copy(sub_dep, libs_folder)
            # recursively discover dependencies
            dependency_walk(sub_dep, arch, libs_folder, brew_folder)


if __name__ == '__main__':
    arch = sys.argv[1]
    app_folder = sys.argv[2]
    brew_folder = sys.argv[3]
    libs_folder = f'{app_folder}/Frameworks/OpenCV.Framework/'
    for dep in os.listdir(libs_folder):
        # ignore non-library files like .DS_Store and folders
        if not dep.endswith('.dylib'):
            continue

        dependency_walk(f'{libs_folder}/{dep}', arch, libs_folder, brew_folder)
