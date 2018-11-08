import './index.css'
import Drawer from './draw'
import ColorPicker from './color-picker'
import {initProgress} from './progress'

ColorPicker.initialize();
Drawer.initialize();
initProgress();


ColorPicker.onPickColor(color => {
  Drawer.onSetColor(color);
});
