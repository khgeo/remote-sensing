from vis_core import *
from rs_chart import chart, bars
import rs_data as R
import numpy as np
from PIL import Image
SRC_L8 = "Landsat 8 OLI · ភ្នំពេញ · ១១ កុម្ភៈ ២០១៩ · USGS"
DOCS_IMG = os.path.join(DOCS, "assets", "img")

def L06():
    # 1 sources timeline
    f = Fig(1000, 440).title("ផ្កាយរណបឥតគិតថ្លៃ តាមពេលវេលា")
    S = [("Landsat 1–3 MSS", 1972, 1983, "#bcaaa4"), ("Landsat 4–5 TM", 1982, 2013, "#a1887f"), ("Landsat 7 ETM+", 1999, 2024, "#8d6e63"), ("Landsat 8 OLI", 2013, 2027, "#6d4c41"), ("Landsat 9", 2021, 2027, "#5d4037"),
         ("MODIS", 2000, 2027, "#1e88e5"), ("Sentinel-1 SAR", 2014, 2027, "#8e24aa"), ("Sentinel-2", 2015, 2027, "#e64a19")]
    X = lambda y: 200 + (y - 1970) / 57 * 740
    for i, (nm, a, b, c) in enumerate(S): y = 90 + i * 38; f.text(190, y + 20, nm, 14, INK, "end"); f.rect(X(a), y + 6, X(b) - X(a), 22, c, rx=5)
    for yr in range(1970, 2031, 10): f.line(X(yr), 90, X(yr), 400, "#eceff1", 1); f.text(X(yr), 420, kh(yr), 13, "#546e7a", "middle")
    entry(6, f.save("r06-timeline"), "បណ្ណសារជាងកន្លះសតវត្ស",
          ["Landsat ផ្ដល់ស៊េរីពេលវេលាតាំងពីឆ្នាំ ១៩៧២៖ តែមួយគត់សម្រាប់សិក្សាការផ្លាស់ប្ដូររយៈពេលវែង។", "Sentinel-2 (២០១៥) ផ្ដល់ក្រឡា ១០ ម និងមកម្ដងទៀតរៀងរាល់ ៥ ថ្ងៃ។", "Sentinel-1 SAR (២០១៤) ថតឆ្លងពពក។"], .1)
    # 2 & 3 existing grid images
    for key, fn, t, bl, wh in [("r06-landsat-grid", "kh-landsat-pathrow-grid.jpg", "ក្រឡា Path/Row នៃ Landsat លើកម្ពុជា", ["កម្ពុជាត្រូវការប្រហែល ៨–១០ ក្រឡា Landsat។", "ភ្នំពេញស្ថិតក្នុង Path ១២៦ Row ៥២។", "ក្រឡាជាប់គ្នាត្រួតគ្នាបន្តិច ហើយថតនៅថ្ងៃខុសគ្នា។"], .35),
                               ("r06-s2-grid", "kh-sentinel2-tile-grid.jpg", "ក្រឡា Sentinel-2 (MGRS) លើកម្ពុជា", ["ក្រឡា ១០០ × ១០០ គម ដាក់ឈ្មោះដូច 48PUV។", "ក្រឡាស្ថិតក្នុងតំបន់ UTM ៤៧ ឬ ៤៨ អាស្រ័យលើទីតាំង។", "ស្វែងរកតាមឈ្មោះក្រឡា ជួយទាញយកលឿនជាងគូសតំបន់។"], .45)]:
        p = os.path.join(DOCS_IMG, fn)
        if os.path.exists(p):
            im = Image.open(p); f = Fig(1000, 540).title(t); w = 900; h = min(430, w * im.size[1] / im.size[0]); w = h * im.size[0] / im.size[1]
            f.img(im, (1000 - w) / 2, 80, w, h); entry(6, f.save(key), t, bl, wh)
    # 4 file naming anatomy
    f = Fig(1000, 400).title("អានឈ្មោះឯកសារ Sentinel-2")
    name = ["S2B", "MSIL2A", "20210215T031809", "N0214", "R118", "T48PUV", "20210215T061510"]
    exp = ["ផ្កាយរណប B", "Level-2A", "ថ្ងៃ និងម៉ោងថត", "កំណែដំណើរការ", "គន្លងទំនាក់ទំនង", "ក្រឡា MGRS", "ថ្ងៃដំណើរការ"]
    x = 40
    for i, (n, e) in enumerate(zip(name, exp)):
        w = len(n) * 12 + 16; f.rect(x, 130, w, 44, QUAL[i], rx=6); f.text(x + w / 2, 158, n, 15, "#fff", "middle", "bold", 'font-family="monospace"')
        f.line(x + w / 2, 176, x + w / 2, 205 + (i % 2) * 40, QUAL[i], 1.5); f.text(x + w / 2, 222 + (i % 2) * 40, e, 13, INK, "middle"); x += w + 8
    f.text(500, 340, "ឈ្មោះឯកសារប្រាប់ ឧបករណ៍ · កម្រិត · ពេលវេលា · ទីតាំង ដោយមិនចាំបាច់បើកឯកសារ", 15, "#607d8b", "middle")
    entry(6, f.save("r06-filename"), "ឈ្មោះឯកសារជាមេតាទិន្នន័យ",
          ["MSIL2A = ការចាំងផ្លាតផ្ទៃ (surface) · MSIL1C = TOA។", "T48PUV = ក្រឡាក្នុងតំបន់ UTM ៤៨។", "កាលបរិច្ឆេទថតជា UTC៖ បូក ៧ ម៉ោងសម្រាប់ម៉ោងកម្ពុជា។"], .6)
    # 5 cloud season (illustrative)
    f = Fig(1000, 420).title("ពពកតាមខែនៅកម្ពុជា (ប្រហាក់ប្រហែល)", "ភាគរយនៃរូបភាពដែលប្រើបាន (< ២០% ពពក) · គំរូបង្រៀន")
    m = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"]; v = [78, 80, 70, 55, 30, 15, 10, 10, 12, 25, 55, 72]
    bars(f, 60, 80, 880, 260, m, v, ["#e64a19" if x > 50 else "#90a4ae" for x in v], vmax=100, fmt=lambda x: kh(x) + "%", horizontal=False)
    entry(6, f.save("r06-cloud-season"), "ជ្រើសរដូវដែលគ្មានពពក",
          ["រដូវប្រាំង (វិច្ឆិកា–មេសា) ផ្ដល់រូបភាពអុបទិកល្អបំផុត។", "រដូវវស្សា ស្ទើរតែគ្មានរូបភាពស្អាតទេ៖ ប្រើ SAR ឬ composite។", "តួលេខជាគំរូបង្រៀន៖ ពិនិត្យតម្លៃពិតក្នុង Copernicus Browser។"], .75)
    # 6 data volume
    f = Fig(1000, 380).title("ទំហំទិន្នន័យដែលត្រូវទាញយក")
    bars(f, 60, 90, 860, 220, ["Landsat 8 L1 (១ ឈុត)", "Sentinel-2 L2A (១ ក្រឡា)", "Sentinel-1 GRD", "RS_Data.zip វគ្គនេះ"], [1000, 1100, 1700, 25], ["#6d4c41", "#e64a19", "#8e24aa", "#43a047"], fmt=lambda x: khn(x) + " MB", lw=230)
    entry(6, f.save("r06-volume"), "រៀបចំអ៊ីនធឺណិត និងថាស",
          ["ឈុតមួយធំប្រហែល ១ GB៖ ទាញយកតែក្រុមរលកដែលត្រូវការ។", "កាត់ (clip) តំបន់សិក្សាភ្លាមៗ ដើម្បីសន្សំទំហំ។", "ទិន្នន័យវគ្គ RS_Data.zip ត្រូវបានកាត់រួច (២៥ MB)។"], .9)

def L07():
    b4 = R.crop(R.dn(4)).astype(float)
    # 1 DN -> TOA -> sun -> DOS for a vegetation pixel
    cls = R.CLS; vegmask = cls == 1; wl = [.48, .56, .655, .865, 1.61, 2.2]
    raw = [float(R.SC[i][vegmask].mean()) * math.sin(math.radians(R.SUN)) for i in range(6)]   # TOA without sun correction
    sun = [float(R.SC[i][vegmask].mean()) for i in range(6)]
    dos = [s - float(np.percentile(R.SC[i], .5)) for i, s in enumerate(sun)]
    f = Fig(1000, 460).title("សញ្ញាណដើមឈើ មុន និងក្រោយកែតម្រូវ", "Landsat 8 · មធ្យមក្រឡាដើមឈើ")
    chart(f, 100, 90, 620, 280, [(wl, raw, "#9e9e9e", "TOA (គ្មានមុំព្រះអាទិត្យ)", 3), (wl, sun, "#8d6e63", "TOA + មុំព្រះអាទិត្យ", 3), (wl, dos, "#2e7d32", "ក្រោយ DOS", 3)], (.4, 2.3), (0, .4), "រលកចម្ងាយ (µm)", "ការចាំងផ្លាត", xt=[.5, 1.0, 1.5, 2.0], yt=[0, .1, .2, .3, .4], lx=750, ly=140)
    entry(7, f.save("r07-correction-steps"), "ការកែតម្រូវនីមួយៗប្ដូរតម្លៃ",
          ["ចែកដោយ sin(មុំព្រះអាទិត្យ) បង្កើនតម្លៃទាំងអស់ ~២៧% (មុំ ៥១,៦°)។", "DOS ដកផ្លូវពន្លឺបរិយាកាស៖ ប្រែប្រួលច្រើនក្នុងខៀវ តិចក្នុង SWIR។", "រូបរាងសញ្ញាណកាន់តែជិតនឹងការចាំងផ្លាតផ្ទៃពិត។"], .45)
    # 2 histogram B2 before/after DOS with dark object
    b2 = R.crop(R.toa(2)).ravel(); dark = np.percentile(b2, .5)
    f = Fig(1000, 420).title("រកវត្ថុងងឹត (Dark Object) ក្នុងអ៊ីស្តូក្រាម B2")
    bins = np.linspace(0, .3, 60); h = np.histogram(b2, bins)[0]; h2 = np.histogram(b2 - dark, bins)[0]; mx = max(h.max(), h2.max())
    ctr = (bins[:-1] + bins[1:]) / 2
    X, Y = chart(f, 100, 90, 640, 250, [(list(ctr), list(h / mx), "#1e88e5", "មុន DOS", 3), (list(ctr), list(h2 / mx), "#e64a19", "ក្រោយ DOS", 3)], (0, .3), (0, 1.05), "ការចាំងផ្លាត B2", "ភាគចំណែក", xt=[0, .1, .2, .3], yt=[0, .5, 1], lx=770, ly=150)
    f.line(X(dark), 90, X(dark), 340, "#1e88e5", 1.5, "4 3"); f.text(X(dark) + 4, 104, f"ងងឹតបំផុត ≈ {kh(round(float(dark), 3))}", 13, "#1e88e5")
    entry(7, f.save("r07-dos-hist"), "Dark Object Subtraction",
          ["ទឹកជ្រៅ ឬស្រមោល គួរមានការចាំងផ្លាតជិតសូន្យ។", "បើក្រឡាងងឹតបំផុតនៅតែមានតម្លៃ តម្លៃនោះមកពីបរិយាកាស។", "ដកតម្លៃនោះពីគ្រប់ក្រឡា → អ៊ីស្តូក្រាមរំកិលទៅឆ្វេង។"], .6)
    # 3 sun elevation seasonal
    f = Fig(1000, 420).title("មុំព្រះអាទិត្យនៅភ្នំពេញ ម៉ោង ១០:៣០ (ប្រហាក់ប្រហែល)")
    days = list(range(0, 365, 5)); lat = 11.55
    elev = [90 - abs(lat - 23.44 * math.sin(2 * math.pi * (d - 80) / 365)) - 12 for d in days]
    chart(f, 100, 90, 700, 250, [(days, elev, "#f9a825", "", 3)], (0, 365), (40, 90), "ថ្ងៃក្នុងឆ្នាំ", "មុំ (ដឺក្រេ)", xt=[0, 60, 120, 180, 240, 300, 365], yt=[40, 50, 60, 70, 80, 90], legend=False)
    f.circle(100 + 42 / 365 * 700, 90 + 250 - (51.6 - 40) / 50 * 250, 6, "#e64a19"); f.text(100 + 42 / 365 * 700 + 10, 90 + 250 - (51.6 - 40) / 50 * 250 + 20, "រូបភាពរបស់យើង ៥១,៦°", 13, "#e64a19")
    entry(7, f.save("r07-sun-season"), "ហេតុអ្វីត្រូវកែតម្រូវមុំព្រះអាទិត្យ",
          ["រដូវប្រាំង ព្រះអាទិត្យទាប → ពន្លឺតិច → រូបភាពងងឹតជាង។", "បើមិនកែតម្រូវ ការប្រៀបធៀបរូបភាពខែកុម្ភៈ និងខែមេសា នឹងខុស។", "ρ = π·L·d² / (ESUN·sin θ)៖ θ ពីឯកសារ MTL។"], .3)
    # 4 DN vs TOA map side by side
    f = Fig(1000, 440).title("DN ធៀបនឹងការចាំងផ្លាត TOA (B5)")
    f.img(Image.fromarray(R.stretch(R.crop(R.dn(5)).astype(float))), 40, 90, 400, 300); f.img(Image.fromarray((np.clip(R.crop(R.toa(5)) / .45, 0, 1) * 255).astype(np.uint8)), 540, 90, 400, 300)
    f.text(240, 415, f"DN៖ {khn(int(R.dn(5).min()))} – {khn(int(R.dn(5).max()))}", 15, IND, "middle", "bold"); f.text(740, 415, "ρ TOA៖ ០ – ០,៥ (គ្មានឯកតា)", 15, IND, "middle", "bold")
    entry(7, f.save("r07-dn-toa"), "រូបរាងដូចគ្នា តម្លៃខុសគ្នា",
          ["រូបភាពពីរមើលទៅដូចគ្នា ព្រោះការបម្លែងជាលីនេអ៊ែរ។", "ប៉ុន្តែតែ ρ ទេដែលអាចប្រៀបធៀបរវាងឧបករណ៍ និងកាលបរិច្ឆេទ។", "សន្ទស្សន៍ (NDVI) ត្រូវគណនាពី ρ មិនមែន DN។"], .15)
    # 5 decision chart correction level
    f = Fig(1000, 420).title("ជ្រើសកម្រិតកែតម្រូវ")
    rows = [("មើលរូបភាពដោយភ្នែក", "DN ឬ TOA", "#90a4ae"), ("ចាត់ថ្នាក់រូបភាពតែមួយ", "TOA", "#8d6e63"), ("សន្ទស្សន៍ និងប្រៀបធៀបពីរកាលបរិច្ឆេទ", "Surface (L2A) ឬ DOS", "#e64a19"), ("គំរូជីវរូបវិទ្យា (LAI ជីវម៉ាស)", "Surface ត្រឹមត្រូវ", "#5d4037")]
    for i, (a, b, c) in enumerate(rows): y = 100 + i * 70; f.rect(60, y, 520, 54, BG, rx=8); f.text(80, y + 34, a, 17); f.rect(620, y, 320, 54, c, rx=8); f.text(780, y + 34, b, 17, "#fff", "middle", "bold")
    entry(7, f.save("r07-decision"), "កែតម្រូវតាមតម្រូវការ",
          ["មិនមែនគ្រប់ការងារត្រូវការការកែតម្រូវបរិយាកាសពេញលេញទេ។", "ការប្រៀបធៀបពេលវេលា ត្រូវការ surface reflectance។", "ប្រើ Level-2 ដែលមានស្រាប់ ពេលអាចធ្វើបាន។"], .85)

def L08():
    im = R.rgb(*[R.crop(R.toa(b)) for b in (4, 3, 2)])
    # 1 resampling methods
    f = Fig(1000, 440).title("វិធីយកគំរូឡើងវិញ (resampling)", "ពង្រីក ៨ ដង · តំបន់ ៤០ × ៤០ ក្រឡា")
    c = im.crop((250, 170, 290, 210))
    for i, (m, t) in enumerate([(Image.NEAREST, "Nearest neighbour"), (Image.BILINEAR, "Bilinear"), (Image.BICUBIC, "Cubic")]):
        f.img(c.resize((320, 320), m), 30 + i * 320, 85, 300, 300); f.text(180 + i * 320, 410, t, 16, IND, "middle", "bold")
    entry(8, f.save("r08-resampling"), "Nearest · Bilinear · Cubic",
          ["Nearest រក្សាតម្លៃដើម៖ ចាំបាច់សម្រាប់ផែនទីថ្នាក់ (class map)។", "Bilinear និង Cubic រលោងជាង ប៉ុន្តែបង្កើតតម្លៃថ្មី។", "សម្រាប់ការចាត់ថ្នាក់ក្រោយ ជៀសវាង resampling ច្រើនដង។"], .45)
    # 2 GCP residuals on image
    f = Fig(1000, 460).title("GCP និងកំហុសសំណល់")
    f.img(im, 40, 80, 480, 360); rng = np.random.default_rng(2); res = []
    for k in range(8):
        x, y = 80 + rng.uniform(0, 400), 110 + rng.uniform(0, 300); dx, dy = rng.normal(0, 6, 2); res.append(math.hypot(dx, dy))
        f.circle(x, y, 6, "none", "#ffeb3b", 2); f.line(x, y, x + dx * 4, y + dy * 4, "#e53935", 2, arrow=True)
    rmse = math.sqrt(np.mean(np.square(res)))
    f.text(580, 160, "RMSE = √(Σ(dx² + dy²) / n)", 18); f.text(580, 210, f"≈ {kh(round(rmse/6, 2))} ក្រឡា", 24, "#e53935", weight="bold"); f.text(580, 260, "គោលដៅ៖ < ០,៥ ក្រឡា (១៥ ម)", 16, "#607d8b"); f.text(580, 290, "ព្រួញពង្រីក ៤ ដង", 14, "#90a4ae")
    entry(8, f.save("r08-gcp-residual"), "វាយតម្លៃការកែតម្រូវធរណីមាត្រ",
          ["ចំណុច GCP គួរជាលក្ខណៈស្ថិរ៖ ផ្លូវប្រសព្វ ស្ពាន ជ្រុងអគារធំ។", "RMSE < ០,៥ ក្រឡា ជាគោលដៅទូទៅសម្រាប់ Landsat។", "កុំប្រើចំណុចលើទឹក ឬព្រំស្រែ ដែលប្ដូរតាមរដូវ។"], .3)
    # 3 misregistration effect on change
    f = Fig(1000, 440).title("រូបភាពពីរមិនត្រួតគ្នា ១ ក្រឡា → «ការផ្លាស់ប្ដូរ» ក្លែងក្លាយ")
    a = R.crop(R.toa(5)); d = np.abs(a[:, 1:] - a[:, :-1])
    f.img(Image.fromarray(R.stretch(a)), 40, 90, 400, 300); f.img(R.ramp_img(d, ["#ffffff", "#ffcc80", "#e53935", "#4a148c"], 0, .15), 540, 90, 400, 300)
    f.text(240, 415, "B5 ដើម", 15, IND, "middle", "bold"); f.text(740, 415, "|B5 − B5 (រំកិល ៣០ ម)|", 15, IND, "middle", "bold")
    entry(8, f.save("r08-misregistration"), "ហេតុអ្វីការត្រួតគ្នាសំខាន់",
          ["រំកិលត្រឹមតែ ១ ក្រឡា បង្កើតភាពខុសគ្នាធំតាមគែមទន្លេ និងផ្លូវ។", "ក្នុងការរកការផ្លាស់ប្ដូរ ភាពខុសគ្នាទាំងនេះមើលទៅដូច «ការផ្លាស់ប្ដូរ»។", "ត្រូវការ co-registration < ០,៥ ក្រឡា មុនធ្វើ change detection។"], .6)
    # 4 mosaic seam (two dates SHV)
    s15, s21 = R.shv(2015), R.shv(2021); A = R.rgb(s15[3], s15[2], s15[1]); B2 = R.rgb(s21[3], s21[2], s21[1])
    w, h = A.size; m = Image.new("RGB", (w, h)); m.paste(A.crop((0, 0, w // 2, h)), (0, 0)); m.paste(B2.crop((w // 2, 0, w, h)), (w // 2, 0))
    f = Fig(1000, 460).title("Mosaic ពីរូបភាពពីរកាលបរិច្ឆេទ", "ឆ្វេង ២០១៥ · ស្ដាំ ២០២១ · ស្នាមភ្ជាប់ច្បាស់")
    f.img(m, 250, 80, 500, 360); f.line(500, 80, 500, 440, "#ffeb3b", 2, "6 4")
    entry(8, f.save("r08-mosaic-seam"), "ស្នាមភ្ជាប់ Mosaic",
          ["រូបភាពពីរថ្ងៃខុសគ្នាមានពន្លឺ ពណ៌ និងគម្របដីខុសគ្នា។", "ជ្រើសរូបភាពរដូវ និងឆ្នាំជិតគ្នា ហើយធ្វើ histogram matching។", "ដាក់ស្នាមភ្ជាប់តាមលក្ខណៈធម្មជាតិ (ទន្លេ ផ្លូវ) ដើម្បីកុំឲ្យលេចធ្លោ។"], .75)
    # 5 drone overlap
    f = Fig(1000, 420).title("ការត្រួតគ្នានៃរូបថតដ្រូន")
    for r in range(3):
        for c in range(5): f.rect(100 + c * 110, 110 + r * 80, 160, 110, "#90caf9", "#1565c0", 1, 4) if False else f.add(f'<rect x="{100+c*110}" y="{110+r*80}" width="160" height="110" fill="#90caf9" fill-opacity=".25" stroke="#1565c0"/>')
    f.path("M 80 165 L 760 165 L 760 245 L 80 245 L 80 325 L 760 325", "none", "#e64a19", 2, extra='stroke-dasharray="6 4"')
    f.text(820, 170, "ត្រួតមុខ ៧៥–៨០%", 17); f.text(820, 205, "ត្រួតចំហៀង ៦០–៧០%", 17); f.text(820, 260, "ចំណុចមួយ = ឃើញ", 16, "#607d8b"); f.text(820, 285, "ក្នុងរូប ៦–៩", 16, "#607d8b")
    entry(8, f.save("r08-drone-overlap"), "ផែនការហោះហើរដ្រូន",
          ["SfM ត្រូវការឃើញចំណុចដដែលពីមុំច្រើន៖ ការត្រួតខ្ពស់ចាំបាច់។", "ត្រួតតិចពេក → ចន្លោះ និង orthomosaic ខូច។", "GCP ≥ ៥ ចែកសព្វ សម្រាប់ភាពត្រឹមត្រូវដាច់ខាត។"], .9)

def L09():
    B = {b: R.crop(R.toa(b)) for b in range(2, 8)}
    # 1 stretches
    r, g, b = B[4], B[3], B[2]
    def lin(a, lo, hi): return (np.clip((a - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8)
    def eq(a):
        v = np.sort(a.ravel()); return (np.searchsorted(v, a) / v.size * 255).astype(np.uint8)
    ims = [Image.fromarray(np.dstack([(np.clip(x / .6, 0, 1) * 255).astype(np.uint8) for x in (r, g, b)])),
           Image.fromarray(np.dstack([lin(x, x.min(), x.max()) for x in (r, g, b)])), Image.fromarray(np.dstack([lin(x, *np.percentile(x, [2, 98])) for x in (r, g, b)])), Image.fromarray(np.dstack([eq(x) for x in (r, g, b)]))]
    f = Fig(1000, 440).title("Stretch បួនបែប លើរូបភាពដូចគ្នា")
    for i, (im, t) in enumerate(zip(ims, ["គ្មាន stretch", "Min–Max", "២% – ៩៨%", "Histogram equalize"])): f.img(im, 20 + i * 245, 90, 225, 200); f.text(132 + i * 245, 320, t, 15, IND, "middle", "bold")
    f.text(500, 380, "Stretch ប្ដូរតែការបង្ហាញ មិនប្ដូរតម្លៃទិន្នន័យទេ", 16, "#e64a19", "middle", "bold")
    entry(9, f.save("r09-stretches"), "ប្រៀបធៀបវិធី Stretch",
          ["គ្មាន stretch៖ ងងឹត ព្រោះតម្លៃប្រមូលផ្ដុំ ០,០៥–០,២។", "Min–Max រងឥទ្ធិពលពីក្រឡាខុសប្រក្រតី (ពពក ដំបូលភ្លឺ)។", "២–៩៨% ជាជម្រើសលំនាំដើមល្អបំផុតសម្រាប់ការមើល។"], .2)
    # 2 histogram before/after stretch (B4)
    f = Fig(1000, 400).title("Stretch ក្នុងអ៊ីស្តូក្រាម (B4)")
    v = r.ravel(); lo, hi = np.percentile(v, [2, 98]); bins = np.linspace(0, .4, 60); h = np.histogram(v, bins)[0]
    for i, c in enumerate(h): f.rect(80 + i * 7, 330 - c / h.max() * 220, 6, c / h.max() * 220, "#e53935")
    X = lambda x: 80 + x / .4 * 420; f.line(X(lo), 100, X(lo), 330, INK, 1.5, "4 3"); f.line(X(hi), 100, X(hi), 330, INK, 1.5, "4 3")
    f.text(290, 360, "តម្លៃដើម ០ – ០,៤", 14, INK, "middle")
    h2 = np.histogram(np.clip((v - lo) / (hi - lo), 0, 1), np.linspace(0, 1, 60))[0]
    for i, c in enumerate(h2): f.rect(560 + i * 7, 330 - c / h2.max() * 220, 6, c / h2.max() * 220, "#8d6e63")
    f.text(770, 360, "ក្រោយ stretch៖ ពេញ ០ – ២៥៥", 14, INK, "middle"); f.line(505, 220, 550, 220, "#607d8b", 3, arrow=True)
    entry(9, f.save("r09-stretch-hist"), "Stretch ពង្រីកចន្លោះតម្លៃ",
          ["តម្លៃ ២% និង ៩៨% ក្លាយជា ០ និង ២៥៥ លើអេក្រង់។", "ក្រឡាក្រៅចន្លោះ ត្រូវកាត់ (saturate)។", "QGIS៖ Symbology → Min/Max → Cumulative count cut 2–98%។"], .3)
    # 3 five band combinations
    f = Fig(1000, 470).title("បន្សំក្រុមរលកប្រាំសម្រាប់គោលបំណងខុសគ្នា")
    combos = [((4, 3, 2), "ពណ៌ពិត"), ((5, 4, 3), "រុក្ខជាតិ"), ((6, 5, 4), "ដី និងទឹក"), ((7, 6, 4), "ទីក្រុង"), ((5, 6, 2), "កសិកម្ម")]
    for i, (c, t) in enumerate(combos):
        f.img(R.rgb(B[c[0]], B[c[1]], B[c[2]]), 15 + i * 197, 90, 185, 250); f.text(107 + i * 197, 370, t, 15, IND, "middle", "bold"); f.text(107 + i * 197, 394, "-".join("B" + kh(x) for x in c), 13, "#607d8b", "middle")
    entry(9, f.save("r09-five-combos"), "ជ្រើសបន្សំតាមសំណួរ",
          ["B5-B4-B3៖ សុខភាពរុក្ខជាតិ (ក្រហមដិត = ព្រៃ)។", "B7-B6-B4៖ សំណង់ និងដីទទេ លេចធ្លោ ពណ៌ស្វាយ-ផ្កាឈូក។", "B5-B6-B2៖ ដំណាំ (បៃតងភ្លឺ) ធៀបនឹងព្រៃ (បៃតងចាស់)។"], .55)
    # 4 RGB channel mapping diagram
    f = Fig(1000, 420).title("របៀប RGB composite ដំណើរការ")
    for i, (bn, ch, c) in enumerate([(5, "ក្រហម (R)", "#e53935"), (4, "បៃតង (G)", "#43a047"), (3, "ខៀវ (B)", "#1e88e5")]):
        y = 90 + i * 105; f.img(Image.fromarray(R.stretch(B[bn])), 60, y, 130, 90); f.text(210, y + 50, f"B{kh(bn)}", 18, INK, weight="bold"); f.line(260, y + 45, 380, 200, c, 3, arrow=True); f.text(300, y + 30, ch, 14, c, weight="bold")
    f.img(R.rgb(B[5], B[4], B[3]), 400, 90, 360, 300); f.text(870, 200, "ពណ៌នីមួយៗ", 16); f.text(870, 228, "= ៣ ក្រុមរលក", 16)
    entry(9, f.save("r09-rgb-channels"), "ក្រុមរលកបីចូលឆានែលពណ៌បី",
          ["ក្រុមរលកណាក៏អាចដាក់ក្នុងឆានែល R G B បាន។", "ក្រឡាដែលភ្លឺក្នុង B5 (NIR) ចេញពណ៌ក្រហមក្នុងបន្សំ B5-B4-B3។", "ត្រូវតែសរសេរបន្សំក្រុមរលកលើផែនទី ដើម្បីកុំឲ្យអ្នកអានយល់ច្រឡំ។"], .45)
    # 5 visual interpretation annotated (false colour)
    fc = R.rgb(B[5], B[4], B[3])
    f = Fig(1000, 470).title("បកស្រាយដោយភ្នែកលើពណ៌សន្មត")
    f.img(fc, 40, 80, 520, 370)
    notes = [(0.22, .18, "ទន្លេ៖ ខៀវ-ខ្មៅ រាងវែង"), (.7, .75, "ព្រៃ/ចម្ការ៖ ក្រហមដិត វាយនភាពគ្រើម"), (.35, .7, "ទីក្រុង៖ ខៀវ-ប្រផេះ លំនាំក្រឡា"), (.62, .3, "ដីចាក់បំពេញ៖ ស ភ្លឺ")]
    for i, (x, y, t) in enumerate(notes):
        px, py = 40 + x * 520, 80 + y * 370; f.circle(px, py, 12, "none", "#ffeb3b", 2.5); f.text(px, py + 5, kh(i + 1), 12, "#ffeb3b", "middle", "bold"); f.text(600, 150 + i * 60, f"{kh(i+1)}. {t}", 16)
    entry(9, f.save("r09-interpret"), "ធាតុនៃការបកស្រាយ",
          ["ពណ៌ រាង វាយនភាព និងទីតាំង ជួយគ្នាក្នុងការស្គាល់វត្ថុ។", "ដីចាក់បំពេញ និងអគារថ្មី ភ្លឺស ព្រោះគ្មានរុក្ខជាតិ។", "ផ្ទៀងផ្ទាត់ជាមួយ Google Earth ឬទីវាល មុនសន្និដ្ឋាន។"], .9)

def L10():
    B = {b: R.crop(R.toa(b)) for b in range(2, 8)}
    idx = {"NDVI": (R.nd(B[5], B[4]), ["#a50026", "#f46d43", "#fee08b", "#a6d96a", "#1a9850"], -.2, .7),
           "NDWI": (R.nd(B[3], B[5]), ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"], -.6, .4),
           "MNDWI": (R.nd(B[3], B[6]), ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"], -.6, .6),
           "NDBI": (R.nd(B[6], B[5]), ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"], -.4, .3),
           "BSI": (R.nd(B[6] + B[4], B[5] + B[2]), ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"], -.4, .3)}
    f = Fig(1000, 470).title("សន្ទស្សន៍ប្រាំលើរូបភាពដូចគ្នា", SRC_L8)
    for i, (k, (a, cols, lo, hi)) in enumerate(idx.items()): f.img(R.ramp_img(a, cols, lo, hi), 15 + i * 197, 90, 185, 250); f.text(107 + i * 197, 370, k, 16, IND, "middle", "bold")
    f.text(500, 420, "NDVI៖ រុក្ខជាតិ · NDWI/MNDWI៖ ទឹក · NDBI/BSI៖ សំណង់ និងដីទទេ", 15, "#607d8b", "middle")
    entry(10, f.save("r10-five-indices"), "សន្ទស្សន៍នីមួយៗបំភ្លឺថ្នាក់មួយ",
          ["NDVI បៃតងលើដើមឈើ និងដំណាំ ក្រហមលើទឹក។", "MNDWI បំបែកទឹកពីទីក្រុងបានល្អជាង NDWI។", "NDBI និង BSI ស្រដៀងគ្នា៖ សំណង់ និងដីទទេពិបាកបំបែក។"], .3)
    # NDVI by class boxplot
    nd = R.nd(R.SCB[5], R.SCB[4])
    f = Fig(1000, 420).title("NDVI តាមថ្នាក់គម្របដី", "ប្រអប់ = ២៥–៧៥% · ខ្សែ = មេដ្យាន")
    X0, W = 120, 800; X = lambda v: X0 + (v + .4) / 1.3 * W
    for c in range(5):
        v = nd[R.CLS == c]; q = np.percentile(v, [5, 25, 50, 75, 95]); y = 100 + c * 55
        f.text(X0 - 10, y + 22, R.CLASS_KH[c], 15, INK, "end"); f.line(X(q[0]), y + 18, X(q[4]), y + 18, "#90a4ae", 1.5); f.rect(X(q[1]), y + 4, X(q[3]) - X(q[1]), 28, R.CLASS_COL[c] if c != 4 else "#8d6e63", op=None) if False else f.add(f'<rect x="{X(q[1]):.1f}" y="{y+4}" width="{X(q[3])-X(q[1]):.1f}" height="28" fill="{R.CLASS_COL[c] if c!=4 else "#8d6e63"}" opacity=".8"/>')
        f.line(X(q[2]), y + 2, X(q[2]), y + 34, "#212121", 2)
    for v in (-.4, 0, .2, .4, .6, .8): f.text(X(v), 395, kh(v), 12, "#546e7a", "middle")
    entry(10, f.save("r10-ndvi-by-class"), "NDVI បំបែកថ្នាក់ណាខ្លះ",
          ["ទឹក (អវិជ្ជមាន) និងដើមឈើ (ខ្ពស់) ដាច់ពីគ្នាល្អ។", "ដំណាំ/ស្មៅ ត្រួតនឹងដើមឈើមួយផ្នែក៖ NDVI តែមួយមិនគ្រប់គ្រាន់។", "សំណង់ និងដីទទេ មាន NDVI ជិតគ្នា (០–០,២)។"], .5)
    # NDVI thresholds
    f = Fig(1000, 440).title("កម្រិតកំណត់ NDVI ប្ដូរលទ្ធផល")
    for i, t in enumerate([.2, .35, .5]):
        m = (idx["NDVI"][0] > t).astype(int); f.img(R.pal_img(m, ["#eeeeee", "#2e7d32"]), 30 + i * 320, 90, 300, 260)
        f.text(180 + i * 320, 380, f"NDVI > {kh(t)} · {kh(round(m.mean()*100))}% រុក្ខជាតិ", 15, IND, "middle", "bold")
    entry(10, f.save("r10-thresholds"), "ការជ្រើសកម្រិតកំណត់",
          ["កម្រិតកំណត់តូច៖ រាប់ស្មៅ និងដំណាំជា «រុក្ខជាតិ»។", "កម្រិតកំណត់ធំ៖ រក្សាតែព្រៃក្រាស់។", "កំណត់កម្រិតពីគំរូពិតលើទីវាល មិនមែនពីតម្លៃ «ស្តង់ដារ» ពីអ៊ីនធឺណិតទេ។"], .7)
    # SHV NDVI 2015 vs 2021 maps
    s15, s21 = R.shv(2015), R.shv(2021); n15, n21 = R.nd(s15[4], s15[3]), R.nd(s21[4], s21[3]); cols = idx["NDVI"][1]
    f = Fig(1000, 440).title("NDVI ក្រុងព្រះសីហនុ ២០១៥ និង ២០២១", "Sentinel-2")
    f.img(R.ramp_img(n15, cols, -.2, .8), 60, 85, 400, 300); f.img(R.ramp_img(n21, cols, -.2, .8), 540, 85, 400, 300)
    f.text(260, 412, "២០១៥", 17, IND, "middle", "bold"); f.text(740, 412, "២០២១", 17, IND, "middle", "bold")
    entry(10, f.save("r10-shv-ndvi"), "សន្ទស្សន៍ ធ្វើឲ្យការផ្លាស់ប្ដូរងាយមើល",
          ["តំបន់ក្រហមថ្មីៗ ក្នុងឆ្នាំ ២០២១ ជាតំបន់ឈូសឆាយ និងសំណង់។", "ផែនទីសន្ទស្សន៍ពីរឆ្នាំ ត្រូវប្រើពណ៌ និងចន្លោះតម្លៃដូចគ្នា។", "មេរៀនទី១៤ គណនាភាពខុសគ្នា និងកំណត់ការផ្លាស់ប្ដូរជាផ្លូវការ។"], .85)
    # ND formula diagram
    f = Fig(1000, 400).title("រចនាសម្ព័ន្ធ Normalized Difference")
    f.text(500, 150, "ND = (A − B) / (A + B)", 34, IND, "middle", "bold")
    for i, (a, b, t) in enumerate([(.45, .05, "រុក្ខជាតិ"), (.02, .05, "ទឹក"), (.22, .18, "សំណង់")]):
        x = 120 + i * 280; v = (a - b) / (a + b); f.rect(x, 200, 240, 130, BG, rx=10); f.text(x + 120, 235, t, 17, INK, "middle", "bold")
        f.text(x + 120, 270, f"NIR {kh(a)} · Red {kh(b)}", 14, "#607d8b", "middle"); f.text(x + 120, 310, f"NDVI = {kh(round(v, 2))}", 20, "#e64a19", "middle", "bold")
    entry(10, f.save("r10-nd-structure"), "ហេតុអ្វី normalize",
          ["ការចែកដោយផលបូក ធ្វើឲ្យតម្លៃស្ថិតនៅ −១ ដល់ +១ ជានិច្ច។", "ពន្លឺរួម (ស្រមោល មុំព្រះអាទិត្យ) ត្រូវកាត់បន្ថយមួយផ្នែក។", "សន្ទស្សន៍ទាំងអស់ក្នុងតារាង គឺជាគូក្រុមរលកផ្សេងៗនៃរូបមន្តនេះ។"], .1)
