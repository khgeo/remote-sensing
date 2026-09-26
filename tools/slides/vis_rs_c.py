from vis_core import *
from rs_chart import chart, bars
import rs_data as R
import numpy as np
from PIL import Image
X6 = np.stack([R.SCB[b] for b in (2, 3, 4, 5, 6, 7)], -1).reshape(-1, 6)
CL = R.CLS.ravel()
COLS5 = [c if c != "#d7ccc8" else "#bcaaa4" for c in R.CLASS_COL]
def kmeans(X, k, iters=10, seed=0):
    rng = np.random.default_rng(seed); C = X[rng.choice(len(X), k, replace=False)]; hist = [C.copy()]
    for _ in range(iters):
        lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), 1)
        C = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)]); hist.append(C.copy())
    return lab, C, hist
def mindist(X, means): return np.argmin(((X[:, None, :] - means[None]) ** 2).sum(-1), 1)
rng = np.random.default_rng(1)
TRAIN = np.concatenate([rng.choice(np.where(CL == c)[0], 60, replace=False) for c in range(5)])
MEANS = np.array([X6[TRAIN][CL[TRAIN] == c].mean(0) for c in range(5)])
PRED = mindist(X6, MEANS)
def confm(ref, pred, n=5):
    M = np.zeros((n, n), int)
    for a, b in zip(ref, pred): M[a, b] += 1
    return M

def L11():
    # k-means scatter red-NIR iterations
    Xs = X6[::15]; lab, C, hist = kmeans(Xs, 5, 10)
    f = Fig(1000, 440).title("K-means ជំហានដោយជំហាន", "លំហក្រហម × NIR · k = ៥")
    for i, it in enumerate([0, 1, 10]):
        x0 = 30 + i * 320; f.rect(x0, 90, 290, 260, "#fff", "#cfd8dc"); Ci = hist[it]
        lb = np.argmin(((Xs[:, None, :] - Ci[None]) ** 2).sum(-1), 1)
        for p, l in zip(Xs[::2], lb[::2]): f.circle(x0 + p[2] / .3 * 290, 350 - p[3] / .45 * 260, 1.8, QUAL[l], op=.7)
        for j, c in enumerate(Ci): f.circle(x0 + c[2] / .3 * 290, 350 - c[3] / .45 * 260, 8, QUAL[j], "#212121", 2)
        f.text(x0 + 145, 380, ["ចាប់ផ្ដើមចៃដន្យ", "ក្រោយ ១ ជំហាន", "ក្រោយ ១០ ជំហាន (រួម)"][i], 15, IND, "middle", "bold")
    entry(11, f.save("r11-kmeans-steps"), "K-means រំកិលចំណុចកណ្ដាល",
          ["ជំហានទី១៖ ចំណុចកណ្ដាលចៃដន្យ · ក្រឡានីមួយៗទៅចំណុចជិតបំផុត។", "គណនាចំណុចកណ្ដាលថ្មី ជាមធ្យមនៃក្រឡាក្នុងចង្កោម ហើយធ្វើម្ដងទៀត។", "ឈប់ពេលចំណុចកណ្ដាលលែងប្ដូរ (រួម)។"], .45)
    # cluster maps k = 3, 5, 8
    f = Fig(1000, 440).title("ផែនទីចង្កោម k = ៣ · ៥ · ៨", "Landsat 8 ភ្នំពេញ · ៦ ក្រុមរលក")
    for i, k in enumerate([3, 5, 8]):
        lab, C, _ = kmeans(X6[::7], k, 12, seed=2); full = mindist(X6, C).reshape(300, 300)
        order = np.argsort(C[:, 3]); remap = np.empty(k, int); remap[order] = np.arange(k)
        cols = ["#1e3a8a", "#2563eb", "#d6c8b4", "#c2410c", "#fde68a", "#a3e635", "#16a34a", "#14532d"]; pal = [cols[int(j * 7 / max(1, k - 1))] for j in range(k)]
        f.img(R.pal_img(remap[full], pal), 30 + i * 320, 90, 290, 290); f.text(175 + i * 320, 410, f"k = {kh(k)}", 17, IND, "middle", "bold")
    entry(11, f.save("r11-cluster-maps"), "ចំនួនចង្កោមប្ដូរលទ្ធផល",
          ["k តូច៖ បញ្ចូលថ្នាក់ខុសគ្នាចូលគ្នា (ដំណាំ + ដើមឈើ)។", "k ធំ៖ បំបែកថ្នាក់មួយជាច្រើនចង្កោម ដែលត្រូវបញ្ចូលគ្នាវិញពេលដាក់ស្លាក។", "អនុវត្តជាក់ស្ដែង៖ ជ្រើស k ធំជាងចំនួនថ្នាក់ ២–៣ ដង រួចដាក់ស្លាក។"], .7)
    # elbow real
    ks = list(range(2, 11)); sse = []
    for k in ks:
        lab, C, _ = kmeans(X6[::10], k, 10, seed=3); sse.append(float(((X6[::10] - C[lab]) ** 2).sum()))
    f = Fig(1000, 420).title("វិធីកែងដៃ (Elbow)", "ផលបូកការេចម្ងាយក្នុងចង្កោម")
    chart(f, 100, 90, 640, 260, [(ks, [s / sse[0] for s in sse], "#e64a19", "", 3)], (2, 10), (0, 1.05), "ចំនួនចង្កោម k", "SSE (ធៀប)", xt=ks, yt=[0, .5, 1], legend=False)
    entry(11, f.save("r11-elbow"), "ជ្រើស k ដោយវិធីកែងដៃ",
          ["SSE ថយចុះជានិច្ចពេល k កើន។", "ចំណុចដែលខ្សែកោងចាប់ផ្ដើមរាប (កែងដៃ) ជា k សមល្មម។", "កែងដៃច្រើនតែមិនច្បាស់៖ ប្រើចំណេះដឹងពីតំបន់បន្ថែម។"], .8)
    # cluster → class labeling table
    lab, C, _ = kmeans(X6[::7], 6, 12, seed=4); full = mindist(X6, C)
    f = Fig(1000, 440).title("ដាក់ស្លាកចង្កោម៖ ចង្កោមណាជាថ្នាក់ណា?", "ធៀបនឹងផែនទីយោង · ភាគរយនៃក្រឡា")
    M = np.zeros((6, 5))
    for j in range(6):
        m = full == j
        for c in range(5): M[j, c] = (CL[m] == c).mean() if m.any() else 0
    for c in range(5): f.text(330 + c * 120, 110, R.CLASS_KH[c], 14, IND, "middle", "bold")
    for j in range(6):
        y = 130 + j * 45; f.text(200, y + 28, f"ចង្កោម {kh(j+1)}", 15, INK, "end")
        for c in range(5):
            v = M[j, c]; f.rect(272 + c * 120, y, 116, 42, f"rgba(93,64,55,{v:.2f})", "#fff"); f.text(330 + c * 120, y + 27, kh(round(v * 100)) + "%", 13, "#fff" if v > .5 else INK, "middle")
    entry(11, f.save("r11-labeling"), "ចង្កោមមិនមែនជាថ្នាក់",
          ["ចង្កោមខ្លះត្រូវនឹងថ្នាក់តែមួយច្បាស់ (ឧ. ទឹក)។", "ចង្កោមខ្លះលាយថ្នាក់ច្រើន៖ ត្រូវការបំបែក ឬទទួលយកកំហុស។", "អ្នកវិភាគសម្រេចស្លាក ដោយប្រើចំណេះដឹង និងរូបភាពលម្អិត។"], .9)
    # LULC classification scheme
    f = Fig(1000, 420).title("គម្របដី ធៀបនឹងការប្រើប្រាស់ដី")
    pairs = [("ព្រៃ (គម្របដី)", "ព្រៃការពារ · ចម្ការកៅស៊ូ (ការប្រើប្រាស់)"), ("ស្មៅ", "វាលស្មៅ · ទីលានបាល់ទាត់ · ទីធ្លាវត្ត"), ("ដីទទេ", "ដីចាក់បំពេញរង់ចាំសាងសង់ · ស្រែក្រោយច្រូត")]
    for i, (a, b) in enumerate(pairs): y = 100 + i * 90; f.rect(60, y, 280, 64, "#a5d6a7", rx=10); f.text(200, y + 40, a, 18, INK, "middle", "bold"); f.line(345, y + 32, 420, y + 32, "#607d8b", 2, arrow=True); f.rect(430, y, 510, 64, BG, rx=10); f.text(685, y + 40, b, 16, INK, "middle")
    entry(11, f.save("r11-cover-use"), "រូបភាពវាស់គម្របដី មិនមែនការប្រើប្រាស់ដី",
          ["គម្របដី = អ្វីនៅលើផ្ទៃ · ការប្រើប្រាស់ដី = មនុស្សប្រើសម្រាប់អ្វី។", "គម្របដីដូចគ្នា អាចមានការប្រើប្រាស់ខុសគ្នា។", "ការប្រើប្រាស់ដីត្រូវការទិន្នន័យបន្ថែម (ផែនទីដីធ្លី សម្ភាសន៍)។"], .1)

def L12():
    # training areas on image
    im = R.rgb(R.SCB[5], R.SCB[4], R.SCB[3])
    f = Fig(1000, 440).title("តំបន់គំរូបណ្ដុះបណ្ដាល (ROI)", "៦០ ក្រឡាក្នុងមួយថ្នាក់ · ចែកសព្វរូបភាព")
    f.img(im, 40, 80, 340, 340)
    for c in range(5):
        for i in TRAIN[CL[TRAIN] == c][::3]: y, x = divmod(int(i), 300); f.circle(40 + x / 300 * 340, 80 + y / 300 * 340, 3.5, COLS5[c], "#fff", .8)
    for c in range(5): f.circle(430, 140 + c * 40, 8, COLS5[c]); f.text(448, 146 + c * 40, R.CLASS_KH[c], 16)
    f.text(430, 370, "ច្បាប់៖ ≥ ១០ × ចំនួនក្រុមរលក ក្រឡា/ថ្នាក់", 15, "#607d8b"); f.text(430, 396, "ROI ច្រើនតូចៗ ល្អជាង ROI ធំមួយ", 15, "#607d8b")
    entry(12, f.save("r12-training"), "ជ្រើសគំរូបណ្ដុះបណ្ដាល",
          ["គំរូត្រូវតំណាងការប្រែប្រួលនៃថ្នាក់ទាំងមូល។", "ចែកសព្វរូបភាព ដើម្បីរួមលក្ខខណ្ឌខុសៗគ្នា។", "កុំយកគំរូនៅគែមរវាងថ្នាក់ (ក្រឡាចម្រុះ)។"], .5)
    # min-distance boundaries in feature space
    f = Fig(1000, 460).title("ព្រំសម្រេចចិត្តនៃ Minimum Distance", "លំហក្រហម × NIR")
    X0, Y0, W, H = 120, 80, 380, 340; step = 8
    for gx in range(0, W, step):
        for gy in range(0, H, step):
            r = gx / W * .3; n = (H - gy) / H * .45; d = [(r - m[2]) ** 2 + (n - m[3]) ** 2 for m in MEANS]; f.rect(X0 + gx, Y0 + gy, step, step, COLS5[int(np.argmin(d))], extra='opacity=".25"')
    for i in TRAIN[::3]: p = X6[i]; f.circle(X0 + p[2] / .3 * W, Y0 + H - p[3] / .45 * H, 2.4, COLS5[CL[i]])
    for c, m in enumerate(MEANS): f.circle(X0 + m[2] / .3 * W, Y0 + H - m[3] / .45 * H, 9, COLS5[c], "#212121", 2)
    f.text(X0 + W / 2, Y0 + H + 28, "ក្រហម", 14, INK, "middle"); f.text(X0 - 30, Y0 + H / 2, "NIR", 14, INK, "middle")
    f.text(560, 160, "រង្វង់ធំ = មធ្យមថ្នាក់", 17); f.text(560, 200, "ផ្ទៃពណ៌ = តំបន់ដែលក្រឡា", 17); f.text(560, 228, "នឹងត្រូវចាត់ទៅថ្នាក់នោះ", 17); f.text(560, 280, "ព្រំ = ចម្ងាយស្មើពីមធ្យមពីរ", 16, "#607d8b")
    entry(12, f.save("r12-mindist"), "ក្រឡាទៅថ្នាក់ដែលមធ្យមនៅជិតបំផុត",
          ["Minimum distance សាមញ្ញ និងលឿន។", "វាមិនគិតពីទំហំការរាយប៉ាយនៃថ្នាក់ទេ៖ ថ្នាក់រាយធំ (ដំណាំ) ត្រូវបាត់ក្រឡា។", "Maximum Likelihood ប្រើអេលីបការរាយប៉ាយ ដើម្បីដោះស្រាយបញ្ហានេះ។"], .3)
    # result vs reference
    f = Fig(1000, 440).title("លទ្ធផល Minimum Distance ធៀបនឹងផែនទីយោង")
    f.img(R.pal_img(PRED.reshape(300, 300), COLS5), 40, 80, 300, 300); f.img(R.pal_img(R.CLS, COLS5), 360, 80, 300, 300)
    agree = (PRED == CL).reshape(300, 300); f.img(R.pal_img(agree.astype(int), ["#e53935", "#eeeeee"]), 680, 80, 300, 300)
    for x, t in [(190, "លទ្ធផលចាត់ថ្នាក់"), (510, "ផែនទីយោង"), (830, f"ក្រហម = ខុស · OA {kh(round(agree.mean()*100))}%")]: f.text(x, 410, t, 15, IND, "middle", "bold")
    entry(12, f.save("r12-result"), "ពិនិត្យលទ្ធផលដោយភ្នែកជាមុន",
          ["កំហុសប្រមូលផ្ដុំតាមគែម និងរវាងសំណង់–ដីទទេ។", "ការមើលផែនទីកំហុស ជួយកែ ROI មុនការវាយតម្លៃផ្លូវការ។", "OA នេះប្រៀបធៀបនឹងផែនទីយោងដែលមានកំហុសផ្ទាល់ខ្លួន (មេរៀនទី១៣)។"], .75)
    # ML ellipses
    f = Fig(1000, 440).title("Maximum Likelihood៖ មធ្យម + ការរាយប៉ាយ")
    X0, Y0, W, H = 120, 80, 380, 320; f.rect(X0, Y0, W, H, "#fff", "#cfd8dc")
    for c in range(5):
        P = X6[TRAIN][CL[TRAIN] == c][:, [2, 3]]; m = P.mean(0); cov = np.cov(P.T); vals, vecs = np.linalg.eigh(cov)
        pts = []
        for a in np.linspace(0, 2 * np.pi, 50):
            v = m + 2 * (vecs @ (np.sqrt(np.maximum(vals, 1e-9)) * np.array([np.cos(a), np.sin(a)]))); pts.append((X0 + v[0] / .3 * W, Y0 + H - v[1] / .45 * H))
        f.path("M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z", COLS5[c], COLS5[c], 1.5, .35)
    f.text(560, 170, "អេលីប = ២ គម្លាតស្តង់ដារ", 17); f.text(560, 210, "ថ្នាក់រាយធំ ទទួលក្រឡាឆ្ងាយៗ", 16); f.text(560, 240, "ត្រូវការគំរូច្រើនជាង MD", 16, "#607d8b")
    entry(12, f.save("r12-ml"), "ការរាយប៉ាយនៃថ្នាក់",
          ["ដំណាំ/ស្មៅ មានអេលីបធំ ព្រោះលាយស្ថានភាពច្រើន។", "ទឹកមានអេលីបតូច ហើយដាច់ពីគេ។", "ML សន្មតថាថ្នាក់មានការចែកចាយ normal៖ មិនពិតជានិច្ចទេ។"], .4)
    # signature table
    f = Fig(1000, 400).title("តារាងមធ្យមថ្នាក់ពីគំរូ (TOA)")
    bands = ["B2", "B3", "B4", "B5", "B6", "B7"]
    for j, b in enumerate(bands): f.text(300 + j * 110, 110, b, 15, IND, "middle", "bold")
    for c in range(5):
        y = 130 + c * 46; f.rect(60, y, 880, 42, BG if c % 2 else "#fff"); f.circle(80, y + 21, 7, COLS5[c]); f.text(96, y + 27, R.CLASS_KH[c], 15)
        for j in range(6): f.text(300 + j * 110, y + 27, kh(round(float(MEANS[c, j]), 3)), 14, INK, "middle")
    entry(12, f.save("r12-signatures"), "សញ្ញាណគំរូ",
          ["ពិនិត្យតារាងនេះមុនចាត់ថ្នាក់៖ ថ្នាក់ពីរដែលតម្លៃជិតគ្នា នឹងច្រឡំគ្នា។", "សំណង់ និងដីទទេ ជិតគ្នាគ្រប់ក្រុមរលក។", "ទឹកមាន B5–B7 ទាបបំផុត៖ ងាយបំបែក។"], .2)

def L13():
    M = confm(CL, PRED); n = M.sum(); oa = np.trace(M) / n
    pa = np.diag(M) / M.sum(1); ua = np.diag(M) / np.maximum(1, M.sum(0))
    pe = (M.sum(0) * M.sum(1)).sum() / n ** 2; kappa = (oa - pe) / (1 - pe)
    # heatmap
    f = Fig(1000, 470).title("តារាងច្របូកច្របល់ពិត", "Minimum distance ធៀបនឹងផែនទីយោង · ៩០ ០០០ ក្រឡា")
    x0, y0, s = 250, 110, 58
    for j in range(5): f.text(x0 + j * s + s / 2, y0 - 12, R.CLASS_KH[j][:6], 11, IND, "middle", "bold")
    for i in range(5):
        f.text(x0 - 8, y0 + i * s + s / 2 + 4, R.CLASS_KH[i], 13, INK, "end")
        for j in range(5):
            v = M[i, j] / M[i].sum(); col = f"rgba({'46,125,50' if i == j else '229,57,53'},{min(1, v * 1.2):.2f})"
            f.rect(x0 + j * s, y0 + i * s, s, s, col, "#fff"); f.text(x0 + j * s + s / 2, y0 + i * s + s / 2 + 5, kh(round(v * 100)), 13, "#fff" if v > .5 else INK, "middle")
    f.text(x0 + 2.5 * s, y0 + 5 * s + 30, "ចាត់ថ្នាក់ជា →", 13, INK, "middle"); f.text(x0 - 120, y0 - 12, "យោង ↓", 13, INK)
    f.text(640, 160, f"OA = {kh(round(oa*100, 1))}%", 24, IND, weight="bold"); f.text(640, 200, f"Kappa = {kh(round(kappa, 2))}", 22, IND, weight="bold"); f.text(640, 250, "លេខ = % នៃជួរដេក", 14, "#607d8b")
    entry(13, f.save("r13-confusion-real"), "អានតារាងច្របូកច្របល់",
          ["អង្កត់ទ្រូង (បៃតង) = ចាត់ថ្នាក់ត្រូវ · ក្រៅអង្កត់ទ្រូង = ច្រឡំ។", "ជួរដេកប្រាប់ថា ថ្នាក់យោងមួយ ត្រូវចាត់ទៅថ្នាក់ណាខ្លះ។", "សំណង់ និងដីទទេ ច្រឡំគ្នាច្រើនបំផុត។"], .15)
    # PA/UA bars
    f = Fig(1000, 440).title("Producer's និង User's accuracy តាមថ្នាក់")
    for c in range(5):
        y = 100 + c * 60; f.text(200, y + 24, R.CLASS_KH[c], 15, INK, "end")
        f.rect(220, y, pa[c] * 600, 22, "#5d4037"); f.text(226 + pa[c] * 600, y + 17, "PA " + kh(round(pa[c] * 100)) + "%", 12)
        f.rect(220, y + 24, ua[c] * 600, 22, "#e64a19"); f.text(226 + ua[c] * 600, y + 41, "UA " + kh(round(ua[c] * 100)) + "%", 12)
    entry(13, f.save("r13-pa-ua"), "ភាពត្រឹមត្រូវពីទស្សនៈពីរ",
          ["PA (អ្នកផលិត)៖ ក្នុងចំណោមដីពិតនៃថ្នាក់នេះ ប៉ុន្មាន % ត្រូវបានរកឃើញ?", "UA (អ្នកប្រើ)៖ ពេលផែនទីនិយាយថាថ្នាក់នេះ ត្រូវប៉ុន្មាន %?", "OA ខ្ពស់អាចលាក់ PA ទាបនៃថ្នាក់តូច។"], .45)
    # sampling designs
    f = Fig(1000, 440).title("យុទ្ធសាស្ត្រយកគំរូផ្ទៀងផ្ទាត់")
    for i, (t, kind) in enumerate([("ចៃដន្យសាមញ្ញ", 0), ("ចៃដន្យតាមស្រទាប់", 1), ("ជាប្រព័ន្ធ", 2)]):
        x0 = 30 + i * 320; f.img(R.pal_img(PRED.reshape(300, 300), COLS5), x0, 90, 290, 290)
        r2 = np.random.default_rng(i)
        if kind == 0: pts = r2.integers(0, 300, (50, 2))
        elif kind == 1: pts = np.concatenate([np.array(divmod(int(k), 300))[None] for c in range(5) for k in r2.choice(np.where(PRED == c)[0], 10, replace=False)])
        else: pts = np.array([[a, b] for a in range(15, 300, 42) for b in range(15, 300, 42)])
        for y, x in pts: f.circle(x0 + x / 300 * 290, 90 + y / 300 * 290, 4, "#fff", "#212121", 1.5)
        f.text(x0 + 145, 410, t, 16, IND, "middle", "bold")
    entry(13, f.save("r13-sampling"), "ជ្រើសចំណុចផ្ទៀងផ្ទាត់",
          ["ចៃដន្យសាមញ្ញ៖ ថ្នាក់តូច (ទឹក ដីទទេ) អាចទទួលគំរូតិចពេក។", "តាមស្រទាប់៖ ចំនួនគំរូស្មើគ្នាក្នុងថ្នាក់នីមួយៗ (ណែនាំ)។", "ចំណុចផ្ទៀងផ្ទាត់ត្រូវដាច់ពីគំរូបណ្ដុះបណ្ដាល។"], .7)
    # area: pixel counting vs reference
    f = Fig(1000, 420).title("ផ្ទៃពីការរាប់ក្រឡា ធៀបនឹងផ្ទៃយោង (ហិកតា)")
    ha = lambda a: np.bincount(a, minlength=5) * 900 / 10000
    hp, hr = ha(PRED), ha(CL)
    for c in range(5):
        y = 100 + c * 58; f.text(200, y + 24, R.CLASS_KH[c], 15, INK, "end"); mx = max(hp.max(), hr.max())
        f.rect(220, y, hr[c] / mx * 560, 22, "#90a4ae"); f.text(226 + hr[c] / mx * 560, y + 17, khn(hr[c]), 12)
        f.rect(220, y + 24, hp[c] / mx * 560, 22, COLS5[c]); f.text(226 + hp[c] / mx * 560, y + 41, khn(hp[c]), 12)
    f.legend_boxes(820, 120, ["#90a4ae", "#5d4037"], ["យោង", "ចាត់ថ្នាក់"])
    entry(13, f.save("r13-area"), "កំហុសប៉ះពាល់ដល់ផ្ទៃ",
          ["ផ្ទៃ = ចំនួនក្រឡា × ៩០០ ម² ÷ ១០ ០០០។", "ថ្នាក់ដែលមាន UA ទាប ត្រូវបានប៉ាន់ស្មានលើស។", "Olofsson (2014) កែតម្រូវផ្ទៃដោយប្រើតារាងច្របូកច្របល់។"], .9)

def L14():
    s15, s21 = R.shv(2015), R.shv(2021); n15, n21 = R.nd(s15[4], s15[3]), R.nd(s21[4], s21[3]); d = n21 - n15
    # true colour pair + difference
    f = Fig(1000, 440).title("ក្រុងព្រះសីហនុ ២០១៥ → ២០២១", "Sentinel-2 ពណ៌ពិត និង ΔNDVI")
    f.img(R.rgb(s15[3], s15[2], s15[1]), 20, 90, 310, 297); f.img(R.rgb(s21[3], s21[2], s21[1]), 345, 90, 310, 297)
    f.img(R.ramp_img(d, ["#b2182b", "#ef8a62", "#f7f7f7", "#67a9cf", "#2166ac"], -.5, .5), 670, 90, 310, 297)
    for x, t in [(175, "២០១៥"), (500, "២០២១"), (825, "ΔNDVI (ក្រហម = បាត់រុក្ខជាតិ)")]: f.text(x, 412, t, 15, IND, "middle", "bold")
    entry(14, f.save("r14-shv-diff"), "ភាពខុសគ្នានៃសន្ទស្សន៍",
          ["ΔNDVI = NDVI(២០២១) − NDVI(២០១៥)។", "ក្រហមដិត = ព្រៃ ឬរុក្ខជាតិដែលបាត់ ដោយសារការសាងសង់។", "ពណ៌ស = គ្មានការផ្លាស់ប្ដូរច្បាស់។"], .3)
    # histogram of diff with thresholds
    v = d.ravel(); mu, sd = v.mean(), v.std()
    f = Fig(1000, 420).title("កំណត់កម្រិត «ការផ្លាស់ប្ដូរ» ពីអ៊ីស្តូក្រាម ΔNDVI")
    bins = np.linspace(-.8, .6, 60); h = np.histogram(v, bins)[0]; ctr = (bins[:-1] + bins[1:]) / 2
    X, Y = chart(f, 100, 90, 640, 250, [(list(ctr), list(h / h.max()), "#5d4037", "", 3)], (-.8, .6), (0, 1.05), "ΔNDVI", "ភាគចំណែក", xt=[-.8, -.4, 0, .4], yt=[0, .5, 1], legend=False)
    for k, c in [(-2, "#e53935"), (2, "#1e88e5")]: x = X(mu + k * sd); f.line(x, 90, x, 340, c, 2, "5 4"); f.text(x, 360, f"μ {'−' if k<0 else '+'} ២σ", 13, c, "middle")
    loss = (v < mu - 2 * sd).mean() * 100; f.text(780, 180, f"បាត់រុក្ខជាតិ៖ {kh(round(loss, 1))}%", 18, "#e53935", weight="bold"); f.text(780, 215, "នៃផ្ទៃ", 15)
    entry(14, f.save("r14-threshold"), "ពី ΔNDVI ទៅផែនទីការផ្លាស់ប្ដូរ",
          ["ក្រឡាភាគច្រើនជុំវិញ ០ (គ្មានការផ្លាស់ប្ដូរ)។", "កន្ទុយខាងឆ្វេង = បាត់រុក្ខជាតិ · កន្ទុយខាងស្ដាំ = រុក្ខជាតិកើនឡើង។", "កម្រិត μ ± ២σ ជាចំណុចចាប់ផ្ដើម៖ ត្រូវផ្ទៀងផ្ទាត់ដោយគំរូ។"], .5)
    # change map
    ch = np.where(d < mu - 2 * sd, 0, np.where(d > mu + 2 * sd, 2, 1))
    f = Fig(1000, 440).title("ផែនទីការផ្លាស់ប្ដូរ ២០១៥–២០២១")
    f.img(R.rgb(s21[3], s21[2], s21[1]), 60, 85, 360, 345)
    rgba = np.zeros(ch.shape + (4,), np.uint8); rgba[ch == 0] = [229, 57, 53, 255]; rgba[ch == 2] = [30, 136, 229, 255]; rgba[ch == 1] = [0, 0, 0, 0]
    f.img(Image.fromarray(rgba), 60, 85, 360, 345, fmt="PNG")
    f.legend_boxes(480, 160, ["#e53935", "#1e88e5"], ["បាត់រុក្ខជាតិ", "រុក្ខជាតិកើន"]); f.text(480, 280, f"បាត់៖ {kh(round((ch==0).mean()*100,1))}% · កើន៖ {kh(round((ch==2).mean()*100,1))}%", 17, INK)
    entry(14, f.save("r14-change-map"), "លទ្ធផលការរកការផ្លាស់ប្ដូរ",
          ["ការបាត់រុក្ខជាតិប្រមូលផ្ដុំនៅតំបន់អភិវឌ្ឍន៍ថ្មី។", "ចំណុចក្រហមតូចៗរាយប៉ាយ អាចជាកំហុស (ពពក រដូវ ការត្រួតគ្នា)។", "ប្រើការច្រោះ (minimum mapping unit) ដើម្បីលុបចំណុចតូចៗ។"], .7)
    # time series NDVI (illustrative)
    t = np.arange(0, 72); base = .55 + .2 * np.sin(2 * np.pi * (t - 3) / 12)
    ts1 = base + np.random.default_rng(1).normal(0, .03, 72); ts2 = np.where(t < 40, base, .15 + .03 * np.sin(2 * np.pi * t / 12)) + np.random.default_rng(2).normal(0, .03, 72)
    f = Fig(1000, 420).title("ស៊េរីពេលវេលា NDVI ប្រចាំខែ (គំរូ)", "២០១៧–២០២២")
    X, Y = chart(f, 100, 90, 640, 250, [(list(t), list(ts1), "#2e7d32", "ព្រៃស្ថិរ (រដូវ)", 2.5), (list(t), list(ts2), "#e53935", "ឈូសឆាយឆ្នាំទី៤", 2.5)], (0, 71), (0, 1), "ខែ", "NDVI", xt=[0, 12, 24, 36, 48, 60], yt=[0, .5, 1], lx=770, ly=150)
    f.line(X(40), 90, X(40), 340, "#e53935", 1.5, "5 4"); f.text(X(40) + 4, 104, "ការរំខាន", 13, "#e53935")
    entry(14, f.save("r14-timeseries"), "ស៊េរីពេលវេលាបំបែករដូវពីការផ្លាស់ប្ដូរ",
          ["NDVI ប្រែប្រួលតាមរដូវជារៀងរាល់ឆ្នាំ៖ មិនមែនការផ្លាស់ប្ដូរទេ។", "ការធ្លាក់ភ្លាមៗ ហើយមិនងើបវិញ = ការរំខាន (ឈូសឆាយ)។", "ការប្រៀបធៀបតែពីរកាលបរិច្ឆេទ អាចច្រឡំរដូវជាការផ្លាស់ប្ដូរ។"], .85)
    # CVA magnitude
    import numpy as np2
    mag = np.sqrt(((s21[1:6] - s15[1:6]) ** 2).sum(0))
    f = Fig(1000, 440).title("Change Vector Analysis៖ ទំហំវ៉ិចទ័រ", "៥ ក្រុមរលក B2–B11")
    f.img(R.ramp_img(mag, ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"], 0, np.percentile(mag, 99)), 60, 85, 360, 345)
    f.text(480, 160, "ទំហំ = √Σ(ρ₂₀₂₁ − ρ₂₀₁₅)²", 18); f.text(480, 210, "ភ្លឺ = ផ្លាស់ប្ដូរខ្លាំង", 16); f.text(480, 240, "ទិស (មុំ) = ប្រភេទនៃការផ្លាស់ប្ដូរ", 16, "#607d8b")
    entry(14, f.save("r14-cva"), "ការផ្លាស់ប្ដូរច្រើនក្រុមរលក",
          ["CVA ប្រើគ្រប់ក្រុមរលក ជំនួសសន្ទស្សន៍តែមួយ។", "ទំហំប្រាប់ «ប៉ុន្មាន» · មុំប្រាប់ «ប្រភេទអ្វី»។", "ចាប់បាននូវការផ្លាស់ប្ដូរដែល NDVI មើលមិនឃើញ (ឧ. ទឹក → ដីចាក់)។"], .6)

def L15():
    rng = np.random.default_rng(5)
    # pseudo SAR from classes (illustrative)
    sig = np.array([-20, -8, -12, -3, -14], float)[R.CLS]          # dB by class
    lin = 10 ** (sig / 10); speck = lin * rng.gamma(1, 1, lin.shape); multi = lin * rng.gamma(4.4, 1 / 4.4, lin.shape)
    from scipy.ndimage import uniform_filter
    lee = uniform_filter(speck, 5)
    toimg = lambda a: Image.fromarray((np.clip((10 * np.log10(a + 1e-6) + 25) / 25, 0, 1) * 255).astype(np.uint8))
    f = Fig(1000, 440).title("Speckle និងការច្រោះ (រូបភាពក្លែងធ្វើ)", "backscatter តាមថ្នាក់ពីផែនទីយោង + speckle")
    for i, (a, t) in enumerate([(lin, "គ្មាន speckle"), (speck, "look ១ (speckle ខ្លាំង)"), (multi, "Multi-look ~៤"), (lee, "ច្រោះ ៥ × ៥")]):
        f.img(toimg(a), 20 + i * 245, 90, 225, 225); f.text(132 + i * 245, 345, t, 15, IND, "middle", "bold")
    entry(15, f.save("r15-speckle"), "Speckle ជាសំឡេងរំខានធម្មជាតិនៃ SAR",
          ["Speckle កើតពីការរំខានគ្នានៃរលកពីវត្ថុតូចៗក្នុងក្រឡាតែមួយ។", "Multi-look និងការច្រោះ កាត់បន្ថយ speckle ប៉ុន្តែបាត់លម្អិត។", "រូបនេះក្លែងធ្វើពីថ្នាក់គម្របដី ដើម្បីបង្រៀន មិនមែនរូបភាព SAR ពិតទេ។"], .45)
    # backscatter mechanisms
    f = Fig(1000, 420).title("យន្តការ backscatter បី")
    for i, (t, c) in enumerate([("ផ្ទៃរលោង (ទឹក)", "#1e88e5"), ("ការខ្ចាត់បរិមាណ (ព្រៃ)", "#2e7d32"), ("ជ្រុងពីរដង (អគារ)", "#e53935")]):
        x0 = 40 + i * 320; f.line(x0 + 30, 110, x0 + 140, 260, "#607d8b", 2.5, arrow=True)
        if i == 0: f.rect(x0, 262, 280, 10, "#90caf9"); f.line(x0 + 145, 262, x0 + 260, 120, c, 2.5, arrow=True); f.text(x0 + 140, 320, "ត្រឡប់ទៅឧបករណ៍តិច → ងងឹត", 13, INK, "middle")
        if i == 1:
            for k in range(6): f.circle(x0 + 100 + (k % 3) * 40, 200 + (k // 3) * 35, 20, "#a5d6a7", "#2e7d32")
            for a in (200, 240, 280, 320): f.line(x0 + 140, 220, x0 + 140 + 70 * math.cos(math.radians(a)), 220 + 70 * math.sin(math.radians(a)), c, 2, arrow=True)
            f.text(x0 + 140, 320, "ខ្ចាត់គ្រប់ទិស → មធ្យម", 13, INK, "middle")
        if i == 2: f.rect(x0 + 160, 140, 20, 125, "#bdbdbd"); f.rect(x0, 262, 280, 10, "#bdbdbd"); f.line(x0 + 140, 262, x0 + 158, 200, c, 2.5); f.line(x0 + 158, 200, x0 + 40, 110, c, 2.5, arrow=True); f.text(x0 + 140, 320, "ត្រឡប់ខ្លាំង → ភ្លឺខ្លាំង", 13, INK, "middle")
        f.text(x0 + 140, 360, t, 16, IND, "middle", "bold")
    entry(15, f.save("r15-mechanisms"), "ហេតុអ្វីទឹកងងឹត និងទីក្រុងភ្លឺក្នុង SAR",
          ["ទឹករលោងចាំងរលកចេញពីឧបករណ៍ → backscatter ទាប (ខ្មៅ)។", "ព្រៃខ្ចាត់ក្នុងមែកស្លឹក → មធ្យម។", "អគារ + ដី បង្កើតជ្រុងពីរដង → ភ្លឺខ្លាំង។"], .25)
    # flood threshold bimodal
    v = 10 * np.log10(multi.ravel() + 1e-6)
    f = Fig(1000, 420).title("កំណត់ទឹកជំនន់ពីអ៊ីស្តូក្រាម backscatter (ក្លែងធ្វើ)")
    bins = np.linspace(-35, 5, 60); h = np.histogram(v, bins)[0]; ctr = (bins[:-1] + bins[1:]) / 2
    X, Y = chart(f, 100, 90, 640, 250, [(list(ctr), list(h / h.max()), "#5d4037", "", 3)], (-35, 5), (0, 1.05), "σ⁰ (dB)", "ភាគចំណែក", xt=[-30, -20, -10, 0], yt=[0, .5, 1], legend=False)
    f.line(X(-17), 90, X(-17), 340, "#1e88e5", 2, "5 4"); f.text(X(-17), 360, "កម្រិត −១៧ dB", 13, "#1e88e5", "middle")
    f.text(780, 160, "ឆ្វេង = ទឹក", 17, "#1e88e5", weight="bold"); f.text(780, 195, "ស្ដាំ = ដី ព្រៃ ទីក្រុង", 17, INK)
    entry(15, f.save("r15-flood-threshold"), "អ៊ីស្តូក្រាមមានកំពូលពីរ",
          ["ទឹកបង្កើតកំពូលទាប (−២០ dB ឬទាបជាង)។", "កម្រិតកំណត់នៅរណ្ដៅរវាងកំពូលទាំងពីរ (ឧ. វិធី Otsu)។", "ចំណុចប្រុងប្រយ័ត្ន៖ ផ្លូវកៅស៊ូ និងស្រមោលភ្នំក៏ងងឹតដែរ។"], .6)
    # optical vs SAR comparison (real optical + simulated SAR)
    f = Fig(1000, 440).title("អុបទិក ធៀបនឹង SAR (ក្លែងធ្វើ)")
    f.img(R.rgb(R.SCB[4], R.SCB[3], R.SCB[2]), 60, 85, 330, 330); f.img(toimg(lee), 560, 85, 330, 330)
    f.text(225, 435, "អុបទិក៖ ពណ៌ និងលម្អិត ប៉ុន្តែពពកបិទ", 14, IND, "middle", "bold"); f.text(725, 435, "SAR៖ ឆ្លងពពក · ទឹកខ្មៅ ទីក្រុងភ្លឺ", 14, IND, "middle", "bold")
    entry(15, f.save("r15-optical-sar"), "ទិន្នន័យពីរប្រភេទបំពេញគ្នា",
          ["អុបទិកល្អសម្រាប់ប្រភេទរុក្ខជាតិ និងពណ៌។", "SAR ល្អសម្រាប់ទឹក រចនាសម្ព័ន្ធ និងរដូវវស្សា។", "ការរួមបញ្ចូលគ្នា (fusion) ផ្ដល់លទ្ធផលល្អជាងមួយណាក៏ដោយ។"], .85)
    # course roadmap
    f = Fig(1000, 400).title("ពីវគ្គនេះ ទៅសៀវភៅទី៤")
    st = [("រូបវិទ្យា", "មេរៀន ១–៣"), ("ទិន្នន័យ", "៤–៦"), ("ត្រៀម", "៧–៩"), ("វិភាគ", "១០–១៣"), ("ការផ្លាស់ប្ដូរ + SAR", "១៤–១៥"), ("GEE + ទ្រង់ទ្រាយធំ", "សៀវភៅទី៤")]
    for i, (a, b) in enumerate(st):
        x = 20 + i * 162; f.rect(x, 150, 148, 100, ["#bcaaa4", "#a1887f", "#8d6e63", "#6d4c41", "#5d4037", "#e64a19"][i], rx=12); f.text(x + 74, 195, a, 15, "#fff", "middle", "bold"); f.text(x + 74, 225, b, 13, "#fff", "middle")
        if i < 5: f.line(x + 149, 200, x + 160, 200, "#607d8b", 2, arrow=True)
    entry(15, f.save("r15-roadmap"), "ផែនទីវគ្គសិក្សា",
          ["វគ្គនេះគ្របដណ្ដប់ពីរូបវិទ្យាដល់ការវិភាគការផ្លាស់ប្ដូរ។", "គម្រោងបញ្ចប់វគ្គ ប្រើជំហានទាំងអស់ក្នុងការងារតែមួយ។", "សៀវភៅទី៤ ពង្រីកទៅ Google Earth Engine និងការវិភាគថ្នាក់ជាតិ។"], .95)
