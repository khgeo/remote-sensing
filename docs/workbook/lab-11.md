# លំហាត់ទី១១៖ ចាត់ថ្នាក់រូបភាពដោយ K-means ក្នុង QGIS

!!! info "ព័ត៌មានលំហាត់"
    **មេរៀនពាក់ព័ន្ធ៖** [មេរៀនទី១១៖ ការចាត់ថ្នាក់គ្មានការណែនាំ](../lessons/lesson-11.md)
    **ការអនុវត្តដោយខ្លួនឯង** · QGIS 3.34 LTR · ប្រហែល ១០០ នាទី

## ស្ថានភាព

អ្នកនឹងធ្វើផែនទីគម្របដីដំបូងគេលើតំបន់សិក្សារបស់អ្នក ដោយប្រើការចាត់ថ្នាក់គ្មានការណែនាំ តាមរយៈកម្មវិធីជំនួយ **Semi-Automatic Classification Plugin (SCP)**។

## គោលបំណង

- ដំឡើង និងរៀបចំ SCP ក្នុង QGIS។
- ដំណើរការ K-means លើរូបភាព Sentinel-2 ពិត។
- ធ្វើតេស្តវិធីកែងដៃ ដើម្បីជ្រើសចំនួនចង្កោម។
- ដាក់ស្លាកចង្កោម និងបញ្ចូលចង្កោមស្រដៀងគ្នា។

## ឯកសារដែលប្រើ

- **ទិន្នន័យវគ្គ (ណែនាំ)**៖ Landsat 8 ភ្នំពេញ TOA · Band set B2 B3 B4 B5 B6 B7 · [`RS_Data.zip`](https://github.com/khgeo/remote-sensing/releases/latest/download/RS_Data.zip) → `L8_PhnomPenh_2019` ([ឧបសម្ព័ន្ធ ខ](../appendix/b-imagery-data.md))
- ឬរូបភាព Sentinel-2 L2A ពីលំហាត់មុន (B2 B3 B4 B8 B11 B12)
- `Kh_Province_Boundary` (ជម្រើស សម្រាប់កំណត់តំបន់)

## ពិសោធន៍មុនចាប់ផ្ដើម · ១៥ នាទី

<div class="sim" data-sim="rs-kmeans"></div>

<div class="sim" data-sim="rs-elbow"></div>

## សកម្មភាពទី១៖ ដំឡើង SCP · ១៥ នាទី

1. **Plugins → Manage and Install Plugins** → ស្វែងរក «Semi-Automatic Classification Plugin» → Install។
2. បើកផ្ទាំង SCP (រូបតំណាងនៅរបារឧបករណ៍)។ បង្កើត **Band set** ថ្មីជាមួយក្រុមរលកទាំងប្រាំមួយ តាមលំដាប់ត្រឹមត្រូវ៖ Landsat B2 B3 B4 B5 B6 B7 (ឬ Sentinel-2 B2 B3 B4 B8 B11 B12)។

## សកម្មភាពទី២៖ ធ្វើតេស្តចំនួនចង្កោម · ២៥ នាទី

1. **SCP → Band processing → Clustering**៖ ជ្រើសក្បួនដោះស្រាយ **K-means**។
2. ដំណើរការជាមួយ k = ៤ ៥ ៦ និង ៧ (ដាច់ដោយឡែក)។ SCP បង្ហាញ **within-cluster distance** ដែលស្រដៀង WCSS។
3. កត់ត្រាតារាង៖

    | k | កំហុសក្នុងចង្កោម | ភាពប្រសើរធៀបនឹង k−១ |
    |---|---:|---:|
    | ៤ | | — |
    | ៥ | | |
    | ៦ | | |
    | ៧ | | |

4. កំណត់ k ដែលសមស្របតាមកែងដៃ។

## សកម្មភាពទី៣៖ ដំណើរការចុងក្រោយ · ២០ នាទី

1. ដំណើរការ K-means ជាមួយ k ដែលបានជ្រើស លើរូបភាពពេញ (ឬតំបន់សិក្សា)។
2. រក្សាទុកលទ្ធផលជា `kmeans_raw.tif`។
3. ដាក់ពណ៌ចៃដន្យផ្សេងគ្នាដល់ចង្កោមនីមួយៗ (Singleband pseudocolor · Random colors)។

## សកម្មភាពទី៤៖ ដាក់ស្លាក · ២៥ នាទី

1. ត្រួតលទ្ធផលលើបន្សំពណ៌ពិត និងពណ៌សន្មត។ សម្រាប់ចង្កោមនីមួយៗ កំណត់ថាតើវាទំនងជាក្រប់ដីអ្វី។
2. ប្រើ **Zonal statistics** ឬចុចលើក្រឡាគំរូ ដើម្បីអានតម្លៃមធ្យមក្រុមរលកនៃចង្កោមនីមួយៗ ជាភស្តុតាងបន្ថែម។
3. **Reclassify** (Raster → Raster Calculator ឬ Reclassify by Table) ដើម្បីបញ្ចូលចង្កោមដែលតំណាងឲ្យក្រប់ដីតែមួយចូលគ្នា។ រក្សាទុកជា `landcover_unsupervised.tif`។
4. បង្កើតសញ្ញាសម្គាល់ផែនទីជាមួយឈ្មោះក្រប់ដីពិត (មិនមែន «ចង្កោម ១» ទៀតទេ)។

## សកម្មភាពទី៥៖ ការពិនិត្យ · ១៥ នាទី

សរសេរ ៥ ប្រយោគ៖ ចំនួនចង្កោមចុងក្រោយ · ថ្នាក់ណាដែលងាយដាក់ស្លាក និងថ្នាក់ណាពិបាក · និងតំបន់ណាដែលមើលទៅមិនត្រឹមត្រូវ ពេលប្រៀបធៀបជាមួយពណ៌ពិត។

## លទ្ធផលត្រូវប្រគល់

- តារាងធៀបកំហុសតាម k និងក្រាបកែងដៃ។
- `kmeans_raw.tif` និង `landcover_unsupervised.tif`។
- សញ្ញាសម្គាល់ផែនទី និងការពិនិត្យ ៥ ប្រយោគ។

## ពិនិត្យលទ្ធផលដោយខ្លួនឯង

អាចវាយលេខខ្មែរ ឬលេខអារ៉ាប់។

<div class="self-check" data-answer="Semi-Automatic Classification Plugin|semi-automatic classification plugin" markdown>
**១.** ឈ្មោះកម្មវិធីជំនួយពេញលេញ (អក្សរកាត់ SCP)?
</div>

<div class="self-check" data-answer="K-means|k-means|kmeans" markdown>
**២.** ក្បួនដោះស្រាយដែលអ្នកប្រើក្នុងលំហាត់នេះ?
</div>

<div class="self-check" data-min="6" data-max="6" markdown>
**៣.** ចំនួនក្រុមរលកក្នុង Band set របស់អ្នក?
</div>

<div class="self-check" data-answer="Reclassify|reclassify" markdown>
**៤.** មុខងារ QGIS ណាប្រើដើម្បីបញ្ចូលចង្កោមចូលគ្នា?
</div>

<div class="self-check" data-answer="Elbow method|elbow method|វិធីកែងដៃ|កែងដៃ" markdown>
**៥.** វិធីណាប្រើសម្រាប់ជ្រើសចំនួនចង្កោម?
</div>

