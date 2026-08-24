#!/usr/bin/env python3
"""ASD-STK100 문체 점검기.

한국어 문서에서 번역투, 일본어 투 단어, 줄표·괄호 부연, 설명용 접두사, 연결 어미 사슬을 찾는다.
결과는 고칠 후보 목록이다. 정규식으로 찾으므로 놓치는 것도 있고 잘못 잡는 것도 있다.
후보마다 문맥을 보고 고칠지 판단한다.

검사 단위는 문단이다. 빈 줄 없이 이어진 줄은 한 문단으로 합친다.
제목, 목록 항목, 표의 행은 따로 검사한다. 결과의 줄 번호는 후보가 나온 줄이다.
코드 블록, 인라인 코드, 링크 주소, 참조형 링크 정의, URL은 검사하지 않는다.
HTML 블록, 각주 문법, 공백 네 칸으로 들여 쓴 코드 블록은 따로 처리하지 않는다.
ATX 제목(#으로 시작하는 제목)의 단일 줄표는 부제로 간주해 P1에서 제외한다.
음차 동사, 기술적 정확성, 의미 보존은 자동 검사 대상이 아니다.

사용법:
    python3 scripts/check_style.py 문서.md [문서2.md ...]
    cat 문서.md | python3 scripts/check_style.py -
    python3 scripts/check_style.py --json 문서.md
    python3 scripts/check_style.py --self-test

종료 코드: 0 후보 없음, 1 후보 있음, 2 입력 오류.
"""
import argparse
import json
import re
import sys
from pathlib import Path

WORD_LIST = Path(__file__).resolve().parent.parent / "references" / "word-list.md"

# (규칙 ID, 정규식, 안내). T는 references/translationese.md, P와 S는 references/rules.md의 항목이다.
PATTERNS = [
    ("T01", r"되어[지져진질짐집졌]|(?<!밝)혀[지져진질짐집졌]|(쓰여|보여|불려|놓여|믿겨|나뉘어|찢겨)[지져진질짐집졌]",
     "이중 피동. '~되다', '~하다'나 능동문으로 쓴다."),
    ("T02", r"에 의(해|하여|한)", "'~에 의해'. 행위자가 있으면 주어로 세워 능동문으로 쓴다."),
    ("T03", r"에 있어(서)?(?![요야도])|함에 있어", "'~에 있어(서)'. 추상적인 대상 뒤면 '~에서', '~할 때'로 쓴다. 위치나 존재를 뜻하면 그대로 둔다."),
    ("T04", r"[을를] 통(해|하여|한)", "'~을 통해'. '~로', '~해서'로 쓴다."),
    ("T05", r"[가-힣](으)?로부터", "'~로부터'. '~에서', '~에게서'로 쓴다."),
    ("T06", r"[을를] (가지|갖)[고는은]|[을를] 갖|[을를] 가(진|집|졌|질)", "'~을 가지다'. '~이 있다'로 쓴다."),
    ("T07", r"(하는|되는) 것이 필요", "'~하는 것이 필요하다'. '~해야 한다'로 쓴다."),
    ("T09", r"(에의|로의|에서의|으로서의|로서의|과의|와의|에게의|으로의)(?![가-힣])", "조사+'의' 겹침. 서술어를 살려 풀어 쓴다."),
    ("T10", r"(?<!대부분)의 경우(에는|에|,)?", "'~의 경우'. '~은/는', '~이면'으로 쓴다."),
    ("T13", r"(^|[\s,(])보다 (더 )?[가-힣]+(게|한|은|할)(?![가-힣])", "부사 '보다'. '더'로 쓴다."),
    ("T14", r"하기 위함|위함(이다|입니다|이며|이고)", "'~하기 위함이다'. 일본어 투다. '~하려는 것이다'로 쓰거나 목적을 앞에 쓴다."),
    ("T15", r"에 다름 아니|라고 하는 [가-힣]", "일본어 투 '~에 다름 아니다', '~라고 하는'."),
    ("T16", r"중에 있(다|습니다|으며|고)", "'~중에 있다'. '~하고 있다', '~중이다'로 쓴다."),
    ("T17", r"(?<![가-힣])(기존|전년|전월|전년도|목표|예산) 대비", "'~ 대비'. '~보다', '~에 비해'로 쓴다."),
    ("T18", r"것이 (좋|바람직|권장)", "'~하는 것이 좋다/권장된다'는 권고다. '~하기를 권한다'로 쓴다. 의무로 올리지 않는다."),
    ("T18", r"것이 중요", "'~하는 것이 중요하다'. '~이 중요하다'처럼 대상을 주어로 쓴다."),
    ("T18", r"것이 (필수|요구)", "'~하는 것이 필수다'는 의무나 필요 조건이다. '~해야 한다'로 쓴다. 권고로 낮추지 않는다."),
    ("T19", r"[을를] (진행|실시|수행|시행)(한|하|할|합|했|됩|된|되)|(진행|실시|수행)(됩|된|되)", "명사+'진행/실시/수행'. 동사를 바로 쓴다."),
    ("T20", r"(발생|향상|감소|증가|개선|완료|만족|정지|중지|변경|이동|적용|활성화|비활성화)시[키켜켰]", "'~시키다' 남용. '~하다'로 쓴다."),
    ("T21", r", 그리고 ", "'A, B, 그리고 C'. 영어 직역이다. 'A, B, C'나 'A와 B, C'로 쓴다."),
    ("T22", r"(핵심|중요한 것|필요한 것|문제|관건|요점|답)은 [^.!?]{0,40}(이다|입니다)[.]", "'핵심은 ~이다' 분열문. 주어와 서술어를 바로 잇는다."),
    ("T23", r"(앞서 (설명|언급)한 (바와 같이|것처럼)|앞서 설명했듯이|결론적으로|요약하자면|다시 말해|정리하면)", "메타 담화. 글의 진행을 알리지 말고 내용을 쓴다."),
    ("T24", r",\s?즉,?\s", "', 즉'으로 다시 말하기. 앞말을 되풀이하면 지우고, 새 정보면 본문 구조에 넣는다."),
    ("P1", r"[—–―ㅡ]|(?<=[가-힣.)\s])--(?=\s)|(?<=[가-힣])--(?=[가-힣])|[가-힣.)]\s+-\s+[A-Za-z가-힣]", "줄표 부연. 본문 구조에 넣거나 지운다. 호응이 흐릴 때만 나눈다. 목록의 뜻풀이도 문장으로 쓴다."),
    ("P3", r"^\s*(참고|주의|경고|확인\s*(기준|결과))\s*[:：]", "설명용 접두사 후보. 내용은 보존하고 따로 둘 보충·위험 안내는 접두사 없는 > 블록으로 쓴다. 실제 키와 값이면 유지한다. references/rules.md 8.4.1을 확인한다."),
]
# 일반 문단의 문장 머리에서만 찾는 패턴. 목록 항목과 표의 "항목: 값"은 정상이다.
PARA_PATTERNS = [
    ("T25", r"(결론|핵심|요약|요점)\s?:", "문단 안의 '결론:'. 쌍점으로 결론을 끌어내지 말고 문장으로 쓴다."),
]
SENT_START = re.compile(r"^(또한|그리고|따라서|이에|이를 통해|이로 인해|이는|이처럼|한편|특히|즉|결과적으로|궁극적으로)[,\s]")
# '-고', '-며'로 끝나는 명사와 인용 어미('~라고', '~다며')는 연결 어미 사슬로 세지 않는다.
NOUN_GO = "그리고|참고|재고|광고|최고|사고|보고|경고|신고|창고|원고|공고|기고|연고|입고|출고"
CHAIN = re.compile(r"(하고|하며|하여|되며|되고|이며|으며|면서|는데|므로|어서|아서|해서|지만|니다만)[,\s]"
                   r"|(?<![가-힣])(?!(?:" + NOUN_GO + r")[,\s])[가-힣]{0,5}[가-힣](?<![라다자냐])(?:고|며)[,\s]")
# 문장 끝 어미로 문체를 가른다. 합니다체, 해요체, 한다체.
ENDINGS = [("합니다체", re.compile(r"(니다|십시오)[.!?]?$")), ("해요체", re.compile(r"요[.!?]?$")),
           ("한다체", re.compile(r"(?<!니)다[.!?]?$"))]
SENT = re.compile(r"\S.*?(?:[.!?](?=\s|$)|$)")
PAREN = re.compile(r"\(([^()]*)\)")
LABEL_VALUE = re.compile(r"^(?!예)[^:,]{1,12}:\s?[^\s,]{1,20}$")
ABOUT = re.compile(r"에 대(한|해|하여)")
QUOTE = re.compile(r"^\s*(?:>\s?)+")
FENCE = re.compile(r"^\s*(`{3,}(?=[^`]*$)|~{3,})")
SEPARATOR = re.compile(r"^\|?\s*:?-{3,}")
REF_DEF = re.compile(r"^\[[^\]]+\]:\s*\S+")
BLOCK_START = re.compile(r"^(#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)")
CODE = re.compile(r"(`+)(.+?)\1")
LINK = re.compile(r"!?\[([^\]]*)\]\((?:[^()\s]|\([^()]*\))*\)")
REF_LINK = re.compile(r"!?\[([^\]]*)\]\[[^\]]*\]")


def load_words():
    """word-list.md 표에서 (피할 말, 바꿀 말, 정규식)을 읽는다.

    셋째 칸이 비면 낱말 앞 경계로 찾는다. "-"이면 건너뛴다.
    셋째 칸의 정규식에도 낱말 앞 경계를 붙인다. 조사나 숫자로 시작하는 정규식은 그대로 쓴다.
    """
    if not WORD_LIST.exists():
        return []
    words = []
    for line in WORD_LIST.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
        if len(cells) < 3 or not cells[0] or cells[0].startswith(("피할", "-", ":")):
            continue
        bad, good, pat = cells[0], cells[1], cells[2].strip("`")
        if pat == "-":
            continue
        if not pat:
            pat = r"(?<![가-힣])" + re.escape(bad)
        elif not pat.startswith(("(?<", "[", "\\d")):
            pat = r"(?<![가-힣])(?:" + pat + ")"
        words.append((bad, good, re.compile(pat)))
    return words


def mask(text):
    """코드, 링크 주소, URL, 강조 기호를 같은 길이의 공백으로 바꾼다. 위치와 낱말 경계를 지키려는 것이다."""
    def blank(m):
        return " " * len(m.group(0))

    def keep_label(m):
        return m.group(1) + " " * (len(m.group(0)) - len(m.group(1)))

    text = CODE.sub(blank, text)
    text = LINK.sub(keep_label, text)
    text = REF_LINK.sub(keep_label, text)
    text = re.sub(r"https?://\S+", blank, text)
    return text.replace("**", "  ").replace("__", "  ")


def units(text):
    """문서를 (종류, 본문, [(본문 안 위치, 줄 번호)]) 단위로 나눈다.

    종류는 para(문단), item(목록 항목), head(제목), table(표의 행)이다.
    """
    out, cur, fence = [], None, None

    def flush():
        nonlocal cur
        if cur and cur[1].strip():
            out.append(cur)
        cur = None

    for no, raw in enumerate(text.splitlines(), 1):
        line = QUOTE.sub("", raw)
        m = FENCE.match(line)
        if fence:
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) and line.strip() == m.group(1):
                fence = None
            continue
        if m:
            flush()
            fence = m.group(1)
            continue
        line = line.strip()
        if not line or SEPARATOR.match(line) or REF_DEF.match(line):
            flush()
            continue
        if BLOCK_START.match(line):
            flush()
            kind = "head" if line.startswith("#") else "table" if line.startswith("|") else "item"
            cur = [kind, re.sub(r"^(#{1,6}|[-*+]|\d+[.)])\s+", "", line), [(0, no)]]
            if kind != "item":
                flush()
        elif cur:
            cur[2].append((len(cur[1]) + 1, no))
            cur[1] += " " + line
        else:
            cur = ["para", line, [(0, no)]]
    flush()
    return [(kind, mask(body), offs) for kind, body, offs in out]


def line_of(offs, pos):
    return [no for start, no in offs if start <= pos][-1]


def check(text, words=None):
    words = load_words() if words is None else words
    out, starts, styles = [], [], []
    for kind, unit, offs in units(text):
        def add(pos, rid, hit, msg, offs=offs):
            out.append((line_of(offs, pos), rid, hit, msg))

        for rid, pat, msg in PATTERNS:
            # ponytail: ATX 제목의 단일 줄표는 부제로 본다. 오탐이 쌓이면 제목 구문을 구분한다.
            if rid == "P1" and kind == "head" and len(re.findall(pat, unit)) == 1:
                continue
            for m in re.finditer(pat, unit):
                add(m.start(), rid, m.group(0).strip(), msg)
        for bad, good, pat in words:
            for m in pat.finditer(unit):
                add(m.start(), "W", m.group(0), f"'{bad}' → '{good}'")
        about = list(ABOUT.finditer(unit))
        if len(about) >= 3:
            add(about[0].start(), "T08", "에 대한/대해", "한 문단에 '~에 대한/대해'가 세 번 이상 나온다. 조사를 바로 쓸 수 있는지 본다.")
        for m in PAREN.finditer(unit):
            body = m.group(1).strip()
            if not re.search(r"[가-힣]", body) or LABEL_VALUE.match(body):
                continue
            if len(body.split()) >= 3 or body.count(",") >= 2 or " 등" in body or body.startswith(("예:", "예를", "즉")) or re.search(r"(다|함|됨|임)\.?$|다\.\s", body):
                add(m.start(), "P2", m.group(0), "괄호 부연. 괄호에는 짧은 값만 두고 설명은 본문 문장으로 쓴다.")
        for m in SENT.finditer(unit):
            s = m.group(0)
            for rid, pat, msg in PARA_PATTERNS if kind == "para" else []:
                if re.match(pat, s):
                    add(m.start(), rid, s[:8], msg)
            if len(CHAIN.findall(s)) >= 3:
                add(m.start(), "S2", s[:25] + "…", "연결 어미가 세 번 이상 이어진다. 호응과 동작 순서가 흐리면 나눈다. 분명하면 둔다.")
            starts.append((line_of(offs, m.start()), SENT_START.match(s)))
            if kind in ("para", "item"):
                style = next((name for name, pat in ENDINGS if pat.search(s.strip())), None)
                if style:
                    styles.append((line_of(offs, m.start()), style, s[:25]))
    hits = [(no, m.group(1)) for no, m in starts if m]
    if starts and len(hits) / len(starts) > 0.2:
        for no, w in hits:
            out.append((no, "S3", w, f"접속어로 시작하는 문장이 {len(starts)}개 중 {len(hits)}개다. 같은 접속어를 되풀이했으면 줄인다."))
    count = {}
    for _, style, _ in styles:
        count[style] = count.get(style, 0) + 1
    if len(count) >= 2:
        main = max(count, key=count.__getitem__)
        minor = [x for x in styles if x[1] != main]
        if len(minor) >= 2 and len(minor) / len(styles) >= 0.1:
            summary = ", ".join(f"{k} {v}" for k, v in count.items())
            for no, _, head in minor[:5]:
                out.append((no, "S4", head + "…", f"문체가 섞였다({summary}). {main}로 맞춘다."))
    return sorted(out)


def self_test():
    w = load_words()
    assert w, "word-list.md를 읽지 못했다"

    def ids(t):
        return {r[1] for r in check(t, words=w)}

    bad = ("금번 작업에 있어서 설정 파일이 읽혀집니다 — 특히 서버에 의해. "
           "보안성 제고를 도모하기 위함입니다(자세한 내용은 별첨을 참조함). 핵심은 속도입니다.")
    assert {"T01", "T02", "T03", "T14", "T22", "P1", "P2", "W"} <= ids(bad), ids(bad)
    good = ("서버는 시작할 때 설정 파일을 읽는다. 파일이 없으면 기본값(30초)을 쓴다. 0.8초 뒤에 다시 읽는다.\n"
            "특정 시점 복구(PITR)를 한다. 이 내용은 밝혀졌다. 줄표를 쓰지 않는다. 스크립트를 실행한다.\n"
            "`--config` 값과 --config 플래그를 쓴다. 재고 관리와 광고 집행, 참고 자료를 본다.\n\n- 결론: 맞다")
    assert not check(good, words=w), check(good, words=w)
    cases = [  # (입력, 있어야 할 ID, 없어야 할 ID)
        ("파일은 서버에 있어요.", set(), {"T03"}),
        ("재시도가 쉬워질 것으로 기대됩니다.", set(), {"T11"}),
        ("응답이 지연될 것으로 예상합니다.", set(), {"T11"}),
        ("외교부에 알린다.", set(), {"W"}),
        ("이 API는 매개변수를 가진다.", {"T06"}, set()),
        ("설정은 관리자에 의해 결정된다.", {"T02"}, set()),
        ("제한 시간(기본값: 없음)을 정한다.", set(), {"P2"}),
        ("옵션(기본값이다. 값을 바꿀 수 있다)을 읽는다.", {"P2"}, set()),
        ("설정ㅡ기본값 설명ㅡ을 바꾼다.", {"P1"}, set()),
        ("기본값을 쓴다 -- 운영에는 맞지 않다.", {"P1"}, set()),
        ("**빌드** - 코드를 묶는다.", {"P1"}, set()),
        ("주의: 상태 디렉터리를 삭제하지 않습니다.", {"P3"}, set()),
        ("- 참고: 명령은 설명용 예시입니다.", {"P3"}, set()),
        ("> **확인 기준**: 상태가 running입니다.", {"P3"}, set()),
        ("상태: 제안\n\n시각: 03:00\n\n{\"timeout\": 30}", set(), {"P3"}),
        ("```text\n주의: 리터럴입니다.\n```\n\n`참고: 값`을 입력합니다.", set(), {"P3"}),
        ("https://example.test:8443/jobs", set(), {"P3"}),
        ("# 배포 가이드 — 시작하기", set(), {"P1"}),
        ("## 금번 배포 - 시작하기", {"W"}, {"P1"}),
        ("# 캐시 — 읽기 위주 — 설정", {"P1"}, set()),
        ("문서로 쓰여진 값이 보여집니다.", {"T01"}, set()),
        ("심각도(긴급,경고,정보)에 따라 보낸다.", {"P2"}, set()),
        ("캐시 - cache를 쓴다.", {"P1"}, set()),
        ("캐시는 빠르다--하지만 만능은 아니다.", {"P1"}, set()),
        ("```code``` 값을 본다.\n금번 작업을 한다.", {"W"}, set()),
        ("배포 시간이 줄어든다, 즉 더 빨리 배포할 수 있다.", {"T24"}, set()),
        ("결론: 캐시는 읽기 위주 서비스에 맞다.", {"T25"}, set()),
        ("캐시는 빠르다. 결론: 캐시를 쓴다.", {"T25"}, set()),
        ("대부분의 경우 롤링 재시작이 가장 효과적인 방법이다.", set(), {"T10"}),
        ("~~~\n금번 배포에 있어서\n~~~\n", set(), {"W", "T03"}),
        ("````\n```\n금번\n```\n````\n", set(), {"W"}),
        ("> ```text\n> 금번\n> ```\n", set(), {"W"}),
        ("``금번`` 값을 쓴다.", set(), {"W"}),
        ("`금번\n설정`을 입력한다.", set(), {"W"}),
        ("금`code`번 값을 쓴다.", set(), {"W"}),
        ("[설명서](docs/금번.md)를 본다.", set(), {"W"}),
        ("[설명서](docs/(v1)/금번.md)를 본다.", set(), {"W"}),
        ("[설명서][doc]를 본다.\n\n[doc]: docs/금번.md\n", set(), {"W"}),
        ("설정에 대한 값과\n로그에 대한 값과\n권한에 대한 값을 본다.", {"T08"}, set()),
        ("서버가 요청을 받고, 값을 검증하며,\n결과를 저장하고, 알림을 보낸다.", {"S2"}, set()),
        ("서버가 요청을 받고 값을 읽고 로그를 남기고 응답을 보낸다.", {"S2"}, set()),
        ("그는 끝났다고 말하고 돌아간다고 하며 웃었다.", set(), {"S2"}),
        ("설정을 엽니다. 값을 바꿉니다. 파일을 저장한다. 서버를 다시 시작한다. 로그를 봅니다.", {"S4"}, set()),
        ("설정을 엽니다. 값을 바꿉니다. 서버를 다시 시작합니다.", set(), {"S4"}),
    ]
    for text, must, must_not in cases:
        got = ids(text)
        assert must <= got and not (must_not & got), (text, got)
    assert len([r for r in check("검토를 요합니다. 조치를 행합니다.", words=w) if r[1] == "W"]) == 2
    msg = {r[3] for r in check("경로를 지정하는 것이 필수입니다.", words=w)}
    assert any("의무" in m for m in msg) and not any("권한다'로 쓴다" in m for m in msg), msg
    lines = [r[0] for r in check("설정을 확인합니다.\n파일을 엽니다.\n금번 작업을 시작합니다.", words=w)]
    assert lines == [3], lines
    lines = [r[0] for r in check("# 배포 — 시작하기\n\n응답이 빨라집니다 — 캐시 덕분입니다.", words=w) if r[1] == "P1"]
    assert lines == [3], lines
    assert all("용어: 설명" not in r[3] for r in check("캐시 - cache를 쓴다.", words=w))
    lines = [r[0] for r in check("주의: 삭제하지 않습니다.\n\n> 참고: 예시입니다.", words=w) if r[1] == "P3"]
    assert lines == [1, 3], lines
    print("self-test ok")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="점검할 파일. '-'는 표준 입력")
    ap.add_argument("--json", action="store_true", help="결과를 JSON으로 출력")
    ap.add_argument("--self-test", action="store_true", help="내장 시험을 실행")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    words, results = load_words(), []
    for f in a.files or ["-"]:
        try:
            text = sys.stdin.read() if f == "-" else Path(f).read_text(encoding="utf-8")
        except OSError as e:
            print(f"파일을 읽지 못했다: {f} ({e.strerror})", file=sys.stderr)
            sys.exit(2)
        results += [{"file": f, "line": no, "rule": rid, "match": hit, "message": msg}
                    for no, rid, hit, msg in check(text, words)]
    if a.json:
        print(json.dumps(results, ensure_ascii=False, indent=1))
    else:
        for r in results:
            print(f"{r['file']}:{r['line']}: [{r['rule']}] {r['match']} | {r['message']}")
    print(f"후보 {len(results)}건. 규칙 설명은 references/rules.md와 references/translationese.md에 있다.", file=sys.stderr)
    sys.exit(1 if results else 0)


if __name__ == "__main__":
    main()
