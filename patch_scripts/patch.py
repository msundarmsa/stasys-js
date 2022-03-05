import platform
import subprocess
import os
import shutil

if __name__ == '__main__':
    if platform.system() == 'Darwin':
        # macos
        app_type = platform.machine()
        if app_type == 'x86_64':
            app_type = 'x64'

        print()
        print(f"=> patching {app_type} app")

        app_folder = f'out/STASYS-darwin-{app_type}/STASYS.app/Contents'

        # fix worker not recognizing opencv native module
        match = 'require.*"opencv4nodejs.node"'
        replace = 'require("..\\/native_modules\\/opencv4nodejs.node"'
        folder = f'{app_folder}/Resources/app/.webpack/renderer/Worker'
        subprocess.run(['sed', '-i', '', f's/{match}/{replace}/g',
                        f'{folder}/index.worker.js'])

        # fix errors in dynamic linking for opencv native module
        for sub_folder in ['main', 'renderer']:
            native_mod = f'{app_folder}/Resources/app/.webpack/{sub_folder}/'\
                          'native_modules/opencv4nodejs.node'
            out = subprocess.run(['otool', '-L', native_mod],
                                 capture_output=True)
            libs = out.stdout.decode().split('\n')

            # first line is usually the name of the .node file
            rpath = '@loader_path/../../../../../Frameworks/OpenCV.framework'
            for lib in libs[1:]:
                if 'opencv' in lib:
                    # clean up lib
                    lib = lib.strip().split(' ')[0]
                    lib_name = os.path.basename(lib).split('.4.5.dylib')[0]
                    lib_name = f'{lib_name}.dylib'

                    subprocess.run(['install_name_tool', '-change', lib,
                                    f'{rpath}/{lib_name}', native_mod],
                                   capture_output=True)
                    print(f'=> patched {lib_name}')

        # copy libraries over
        to_folder = f'{app_folder}/Frameworks/OpenCV.framework'
        from_folder = f'opencv-bindings/prebuilt-opencv/mac-{app_type}/'
        shutil.copytree(f'{from_folder}/all_deps', to_folder)
        print('=> complete')
    else:
        # windows
        print()
        print("=> patching win32-x64 app")

        app_folder = 'out/STASYS-win32-x64'

        # fix worker not recognizing opencv native module
        match = 'require.*"opencv4nodejs.node"'
        replace = 'require("..\/native_modules\/opencv4nodejs.node"'
        folder = f'{app_folder}/resources/app/.webpack/renderer/Worker'
        subprocess.run(['sed', '-i', f"'s/{match}/{replace}/g'",
                        f'{folder}/index.worker.js'])

        # copy libraries over
        to_folder = f'{app_folder}'
        from_folder = 'opencv-bindings/prebuilt-opencv/win-intel64/'
        for lib in os.listdir(from_folder):
            if '.dll' in lib:
                shutil.copy(f'{from_folder}/{lib}', app_folder)
                print(f'=> patched {lib}')

        print("=> complete")
