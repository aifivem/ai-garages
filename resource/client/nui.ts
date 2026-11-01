import { loadLocaleTexts } from "@aicore-fivem/lib/client";
import { NUI_LAYER } from "@aicore-fivem/shared";

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.screen);

export const texts = loadLocaleTexts();
