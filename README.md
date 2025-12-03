# ANNdrew GUI

Web-based editor for files in the ANN format used for storing 2D animations in games created by Aidem Media.

## How to use

The project is deployed to: https://dove6.github.io/anndrew-gui/

First, you have to upload a file to edit by clicking the "Upload ANN file" button or simply dragging the file from your disk and dropping it within the button. If you want to start from ~~square one~~ zero, click the "Or create a new file" button instead.

What awaits you after the file loads, is the main editor view consisting of multiple columns. The first column from the left ("Images") contains the list of all reference image frames (so-called images). The following columns (if any) represent the animated sequences (so-called events) stored inside the file. Each event is composed of references to the images (so-called frames).

Images can be added by dragging graphics[^1] files from disk and dropping them on the "Images" column or by clicking the "Upload image" button on the bottom of the column. Entries in the "Images" column can be also replaced in-place using images loaded from disk (using the "Replace image from disk" button). Events can be appended by clicking the "Create event" button on the right. Frames can be added to an event by dragging images from the "Images" column and dropping them on the column related to that event. Frames can be moved between events using drag-and-drop mechanics. All columns and their entries have drop-down menus with additional options (e.g. for removing a column, duplicating an image).

The header of the editor view consists of global properties of the file, including its filename, author, description, animation speed and opacity. Aside from that, each image has its own name and absolute offset (from the upper left corner of the screen). Then, each event has its name, opacity and loop length (a number of frames after which it restarts, with 0 meaning none). Finally, each frame has a name, offset (relative to image offset), opacity and a list of paths of sound files to be randomly chosen and played when the frame is displayed. All offsets are summed together and all opacities are multiplied.

After the work is done, the final ANN file can be exported by clicking on the "Download edited ANN" button in the upper right corner of the editor view. Work can be also discarded using the "Close without saving" button in the upper left corner of the page.

## Development

This is a static site written using [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/). Its built using the following stack: [pnpm](https://pnpm.io/), [Vite](https://vite.dev/), [Babel](https://babeljs.io/), and [Rolldown](https://rolldown.rs/).

### Setting up dependencies

```sh
pnpm install
```

### Running development server

```sh
pnpm run dev
```

### Building the page

```sh
pnpm run build
```

## Related projects

- command-line tool for manipulating ANN and IMG files: https://github.com/mysliwy112/AM-transcoder
- collection of decoded ANN files from the original games: https://github.com/mysliwy112/mysliwy112.github.io
- reimplementation of the PiKlib/BlooMoo engine Reksio games run on: https://github.com/ReksioEngine/ReksioEngine
- encoder/decoder of PiKlib/BlooMoo script files: https://github.com/Dove6/AMkd

---
[^1]: JPEG, PNG, BMP, TIFF, GIF, or IMG
