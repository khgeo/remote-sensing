# សៀវភៅទី៣៖ មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ

### សម្រាប់វគ្គសិក្សា ១ ឆមាស · ៤៥ ម៉ោង · ១៥ មេរៀន · ១៥ លំហាត់ · ជាភាសាខ្មែរ

---

សៀវភៅនេះជាឯកសារបង្រៀនសម្រាប់មុខវិជ្ជា **ការយកព័ត៌មានពីចម្ងាយ (Remote Sensing)** កម្រិតបរិញ្ញាបត្រ ឆ្នាំទី៣ ឆមាសទី១ ដេប៉ាតឺម៉ង់ភូមិវិទ្យា និងរៀបចំដែនដី។ វាមាន **១៥ មេរៀនទ្រឹស្ដី** (៣ ម៉ោងក្នុងមួយមេរៀន) និង **សៀវភៅអនុវត្ត ១៥ លំហាត់** លើ **QGIS** ដោយប្រើរូបភាព **Sentinel-2** និង **Landsat** ឥតគិតថ្លៃលើតំបន់កម្ពុជា។

[:material-file-pdf-box: ទាញយកសៀវភៅ PDF](https://github.com/khgeo/remote-sensing/releases/latest/download/fundamentals-of-remote-sensing.pdf){ .md-button .md-button--primary }
[:material-database: ទិន្នន័យវគ្គ RS_Data.zip](https://github.com/khgeo/remote-sensing/releases/latest/download/RS_Data.zip){ .md-button }
[:material-wifi-off: កំណែ offline (ZIP)](https://khgeo.github.io/remote-sensing/downloads/remote-sensing-offline.zip){ .md-button }

## ស៊េរីសៀវភៅទាំង ៤

| សៀវភៅ | ចំណងជើង | ឆ្នាំ/ឆមាស |
|---|---|---|
| ទី១ | [ផែនទីវិទ្យា](https://khgeo.github.io/cartography/) | ឆ្នាំទី២ ឆមាសទី១ |
| ទី២ | [មូលដ្ឋានគ្រឹះនៃ GIS](https://khgeo.github.io/gis-fundamentals/) | ឆ្នាំទី២ ឆមាសទី២ |
| **ទី៣** | **មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ** ← សៀវភៅនេះ | ឆ្នាំទី៣ ឆមាសទី១ |
| ទី៤ | [អនុវត្តន៍ GIS និងការយកព័ត៌មានពីចម្ងាយ](https://khgeo.github.io/applied-gis-rs/) | ឆ្នាំទី៣ ឆមាសទី២ |

មើលស៊េរីទាំងមូលនៅ [khgeo.github.io](https://khgeo.github.io/)។

!!! abstract "អ្វីដែលសៀវភៅនេះបង្រៀន និងមិនបង្រៀន"
    សៀវភៅនេះបង្រៀន **រូបវិទ្យានៃរលកអេឡិចត្រូម៉ាញេទិច ឧបករណ៍ចាប់សញ្ញា គុណភាពបង្ហាញ ការកែតម្រូវរូបភាព បន្សំក្រុមរលក សន្ទស្សន៍ស្ពិចត្រាល់ ការចាត់ថ្នាក់ ការវាយតម្លៃភាពត្រឹមត្រូវ ការរកការផ្លាស់ប្ដូរ និងការណែនាំអំពីរ៉ាដា SAR**។

    ការធ្វើផែនទី និងការរចនា យោងទៅ[សៀវភៅទី១](https://khgeo.github.io/cartography/) ឯការវិភាគលំហ និងការគ្រប់គ្រងទិន្នន័យ យោងទៅ[សៀវភៅទី២](https://khgeo.github.io/gis-fundamentals/)។ ការប្រើ **Google Earth Engine** សម្រាប់ការវិភាគទ្រង់ទ្រាយធំ ជាខ្លឹមសារសៀវភៅទី៤។

## អានដោយគ្មានអ៊ីនធឺណិត

<div class="offline-save"></div>

- **ទូរសព្ទ ឬកុំព្យូទ័រផ្ទាល់ខ្លួន**៖ ចុចប៊ូតុងខាងលើម្ដង ពេលមាន Wi-Fi។ ក្រោយមក បើកតំណ [khgeo.github.io/remote-sensing](https://khgeo.github.io/remote-sensing/) ដដែល ទោះគ្មានអ៊ីនធឺណិតក៏បាន។ មេរៀន លំហាត់ **ស្លាយបង្រៀន** និងពិសោធន៍ ត្រូវបានរក្សាទុកទាំងអស់។ លើទូរសព្ទ ប្រើ «Add to Home screen» ដើម្បីបើកដូចកម្មវិធី។
- **កុំព្យូទ័របន្ទប់ពិសោធន៍ ឬគ្មានអ៊ីនធឺណិតសោះ**៖ ទាញយក [កំណែ offline (ZIP)](https://khgeo.github.io/remote-sensing/downloads/remote-sensing-offline.zip) ចម្លងតាម USB ពន្លា (Extract) ហើយបើក `START_HERE.html` ក្នុង Chrome, Edge ឬ Firefox។ មិនចាំបាច់ដំឡើងអ្វីទេ។
- ស្លាយបើកជារបៀបបញ្ចាំង (slide show) ពេញអេក្រង់បានទាំងពីររបៀប។ ផែនទីផ្ទៃក្រោយ OpenStreetMap ក្នុងលំហាត់ តំណខាងក្រៅ និង Earth Engine នៅតែត្រូវការអ៊ីនធឺណិត។

## ចាប់ផ្ដើមពីណា?

<div class="grid cards" markdown>

- :material-satellite-variant: **សម្រាប់និស្សិត**

    ចាប់ផ្ដើមពី [មេរៀនទី១](lessons/lesson-01.md)។ ត្រូវដំឡើង QGIS ជាមុន ([ឧបសម្ព័ន្ធ ក](appendix/a-qgis-install.md)) ហើយបង្កើតគណនី Copernicus ([ឧបសម្ព័ន្ធ ខ](appendix/b-imagery-data.md))។

- :material-human-male-board: **សម្រាប់គ្រូបង្រៀន**

    មើល [កម្មវិធីសិក្សា](syllabus.md) សម្រាប់ការបែងចែក ៤៥ ម៉ោង។

- :material-image-filter-center-focus: **សៀវភៅអនុវត្ត**

    [លំហាត់ទី១](workbook/lab-01.md) ដល់ [លំហាត់ទី១៥](workbook/lab-15.md)៖ ធ្វើការលើរូបភាព Sentinel-2 និង Landsat ពិតប្រាកដ។

- :material-translate: **អំពីវាក្យសព្ទ**

    វាក្យសព្ទរួមតែមួយសម្រាប់ស៊េរីទាំង ៤។ មើល [វាក្យសព្ទបច្ចេកទេស](glossary.md)។

</div>

## អាជ្ញាបណ្ណ

ខ្លឹមសារចេញផ្សាយក្រោម **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.km)**។ រូបភាព Sentinel-2 និង Landsat ជាទិន្នន័យបើកចំហ (Copernicus · USGS)។
