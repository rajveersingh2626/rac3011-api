import json
import re

clubs_raw = """
DISTRICT|District Secretariat 3011|District Secretariat|district-secretariat-3011
c57|Rotaract Club of Apeejay Stya University|Apeejay Stya University|rotaract-club-of-apeejay-stya-university
c48|Rotaract Club of Catalyst|Catalyst|rotaract-club-of-catalyst
c1|Rotaract Club of College of Vocational Studies|College of Vocational Studies|rotaract-club-of-college-of-vocational-studies
c58|Rotaract Club of DAVIM|DAVIM|rotaract-club-of-davim
c31|Rotaract Club of DPSRU|DPSRU|rotaract-club-of-dpsru
c39|Rotaract Club of DTU Regency|DTU Regency|rotaract-club-of-dtu-regency
c59|Rotaract Club of DUSC|DUSC|rotaract-club-of-dusc
c19|Rotaract Club of Delhi Capital Circle|Delhi Capital Circle|rotaract-club-of-delhi-capital-circle
c20|Rotaract Club of Delhi Dynamic Leaders|Delhi Dynamic Leaders|rotaract-club-of-delhi-dynamic-leaders
c40|Rotaract Club of Delhi Elite|Delhi Elite|rotaract-club-of-delhi-elite
c61|Rotaract Club of Delhi Genesis|Delhi Genesis|rotaract-club-of-delhi-genesis
c62|Rotaract Club of Delhi Genesis Midwest|Delhi Genesis Midwest|rotaract-club-of-delhi-genesis-midwest
c23|Rotaract Club of Delhi Heights|Delhi Heights|rotaract-club-of-delhi-heights
c21|Rotaract Club of Delhi Imperia|Delhi Imperia|rotaract-club-of-delhi-imperia
c63|Rotaract Club of Delhi Janak|Delhi Janak|rotaract-club-of-delhi-janak
c6|Rotaract Club of Delhi MAIMS|Delhi MAIMS|rotaract-club-of-delhi-maims
c41|Rotaract Club of Delhi Manthan|Delhi Manthan|rotaract-club-of-delhi-manthan
c7|Rotaract Club of Delhi Midtown Maitreyi|Delhi Midtown Maitreyi|rotaract-club-of-delhi-midtown-maitreyi
c22|Rotaract Club of Delhi Rajdhani|Delhi Rajdhani|rotaract-club-of-delhi-rajdhani
c8|Rotaract Club of Delhi South|Delhi South|rotaract-club-of-delhi-south
c9|Rotaract Club of Delhi South Central|Delhi South Central|rotaract-club-of-delhi-south-central
c5|Rotaract Club of Delhi South East|Delhi South East|rotaract-club-of-delhi-south-east
c10|Rotaract Club of Delhi Southend Next|Delhi Southend Next|rotaract-club-of-delhi-southend-next
c65|Rotaract Club of Delhi Yuva|Delhi Yuva|rotaract-club-of-delhi-yuva
c11|Rotaract Club of GD Goenka University, Sohna|GD Goenka University, Sohna|rotaract-club-of-gd-goenka-university-sohna
c2|Rotaract Club of Galgotias Educational Institutions|Galgotias Educational Institutions|rotaract-club-of-galgotias-educational-institutions
c12|Rotaract Club of Ilmaura|Ilmaura|rotaract-club-of-ilmaura
c28|Rotaract Club of Indira Gandhi Delhi Technical University for Women|Indira Gandhi Delhi Technical University for Women|rotaract-club-of-indira-gandhi-delhi-technical-university-for-women
c3|Rotaract Club of Ingenious Minds|Ingenious Minds|rotaract-club-of-ingenious-minds
c49|Rotaract Club of Kirori Mal College|Kirori Mal College|rotaract-club-of-kirori-mal-college
c30|Rotaract Club of Lakshmibai College|Lakshmibai College|rotaract-club-of-lakshmibai-college
c_maharaja_agarsain|Rotaract Club of Maharaja Agarsain|Maharaja Agarsain|rac-maharaja-agarsain
c68|Rotaract Club of Meraki|Meraki|rotaract-club-of-meraki
c69|Rotaract Club of NDIM|NDIM|rotaract-club-of-ndim
c66|Rotaract Club of NSIT Regency|NSIT Regency|rotaract-club-of-nsit-regency
c32|Rotaract Club of National Association for Blind|National Association for Blind|rotaract-club-of-national-association-for-blind
c51|Rotaract Club of New Delhi|New Delhi|rotaract-club-of-new-delhi
c16|Rotaract Club of Resilience|Resilience|rotaract-club-of-resilience
c52|Rotaract Club of Rever|Rever|rotaract-club-of-rever
c71|Rotaract Club of Shri Ram College of Commerce|Shri Ram College of Commerce|rotaract-club-of-shri-ram-college-of-commerce
c17|Rotaract Club of Sri Guru Gobind Singh College of Commerce|Sri Guru Gobind Singh College of Commerce|rotaract-club-of-sri-guru-gobind-singh-college-of-commerce
c53|Rotaract Club of Sri Guru Teg Bahadur Khalsa College|Sri Guru Teg Bahadur Khalsa College|rotaract-club-of-sri-guru-teg-bahadur-khalsa-college
c54|Rotaract Club of Sushant University|Sushant University|rotaract-club-of-sushant-university
c72|Rotaract Club of The North'Cap University|The North'Cap University|rotaract-club-of-the-north-cap-university
c55|Rotaract Club of Trinity Institute Dwarka|Trinity Institute Dwarka|rotaract-club-of-trinity-institute-dwarka
c37|Rotaract Club of Unified Spirits|Unified Spirits|rotaract-club-of-unified-spirits
c74|Rotaract Club of Visioners League|Visioners League|rotaract-club-of-visioners-league
c75|Rotaract Club of World Without Childhood Blindness|World Without Childhood Blindness|rotaract-club-of-world-without-childhood-blindness
c56|Rotaract Club of Young Souvenirs|Young Souvenirs|rotaract-club-of-young-souvenirs
"""

db_clubs = []
for line in clubs_raw.strip().split("\n"):
    if not line.strip():
        continue
    parts = line.strip().split("|")
    db_clubs.append({
        "id": parts[0],
        "name": parts[1],
        "shortName": parts[2],
        "slug": parts[3]
    })

with open("backlogs_data/db_clubs.json", "w", encoding="utf-8") as f:
    json.dump(db_clubs, f, indent=2)

print(f"Saved {len(db_clubs)} db clubs to backlogs_data/db_clubs.json")
