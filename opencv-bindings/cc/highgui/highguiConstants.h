#include "macros.h"
#include <opencv2/highgui.hpp>

#ifndef __FF_HIGHGUI_CONSTANTS_H__
#define __FF_HIGHGUI_CONSTANTS_H__

class HighguiConstants {
public:
  static void Init(v8::Local<v8::Object> module);
};

#endif