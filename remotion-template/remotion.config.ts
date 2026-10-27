import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// If renders come out black on Windows, ANGLE usually fixes it.
Config.setChromiumOpenGlRenderer("angle");
