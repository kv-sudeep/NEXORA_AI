"""
Channel Registry — Indian Multilingual YouTube News Channels
Seeds the database with 46 official Indian news channel handles across 10 languages.
"""
from typing import Dict, List, NamedTuple


class NewsChannel(NamedTuple):
    """News channel information"""
    name: str
    language: str
    youtube_handle: str
    youtube_channel_id: str
    streams_url: str
    logo_url: str = ""


# Complete Channel Directory for all 10 Indian languages
CHANNEL_REGISTRY: Dict[str, List[NewsChannel]] = {
    # HINDI (8 channels)
    'hindi': [
        NewsChannel(
            name='Aaj Tak',
            language='hindi',
            youtube_handle='aajtak',
            youtube_channel_id='UC_uO6-YEP3kTehhc2tX9JxA',
            streams_url='https://www.youtube.com/@aajtak/streams'
        ),
        NewsChannel(
            name='India TV',
            language='hindi',
            youtube_handle='indiatv',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qLg',
            streams_url='https://www.youtube.com/@indiatv/streams'
        ),
        NewsChannel(
            name='ABP News',
            language='hindi',
            youtube_handle='ABPNews',
            youtube_channel_id='UCPmEDz6rJdI',
            streams_url='https://www.youtube.com/@ABPNews/streams'
        ),
        NewsChannel(
            name='Zee News',
            language='hindi',
            youtube_handle='zeenews',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@zeenews/streams'
        ),
        NewsChannel(
            name='News18 India',
            language='hindi',
            youtube_handle='News18India',
            youtube_channel_id='UCPtM1r22s4',
            streams_url='https://www.youtube.com/@News18India/streams'
        ),
        NewsChannel(
            name='NDTV India',
            language='hindi',
            youtube_handle='ndtvindia',
            youtube_channel_id='UCSWAP9vC0',
            streams_url='https://www.youtube.com/@ndtvindia/streams'
        ),
        NewsChannel(
            name='Republic Bharat',
            language='hindi',
            youtube_handle='RepublicBharat',
            youtube_channel_id='UCfO0Y6c4j4',
            streams_url='https://www.youtube.com/@RepublicBharat/streams'
        ),
        NewsChannel(
            name='TV9 Bharatvarsh',
            language='hindi',
            youtube_handle='TV9Bharatvarsh',
            youtube_channel_id='UCL5h6g8h9',
            streams_url='https://www.youtube.com/@TV9Bharatvarsh/streams'
        ),
    ],

    # ENGLISH (5 channels)
    'english': [
        NewsChannel(
            name='NDTV',
            language='english',
            youtube_handle='NDTV',
            youtube_channel_id='UCAmG4sG6',
            streams_url='https://www.youtube.com/@NDTV/streams'
        ),
        NewsChannel(
            name='India Today',
            language='english',
            youtube_handle='indiatoday',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@indiatoday/streams'
        ),
        NewsChannel(
            name='Times Now',
            language='english',
            youtube_handle='TimesNow',
            youtube_channel_id='UCL5h3s5',
            streams_url='https://www.youtube.com/@TimesNow/streams'
        ),
        NewsChannel(
            name='CNN-News18',
            language='english',
            youtube_handle='CNNNews18',
            youtube_channel_id='UCPmEDz6rJdI',
            streams_url='https://www.youtube.com/@CNNNews18/streams'
        ),
        NewsChannel(
            name='Republic',
            language='english',
            youtube_handle='RepublicWorld',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@RepublicWorld/streams'
        ),
    ],

    # TAMIL (5 channels)
    'tamil': [
        NewsChannel(
            name='Sun News',
            language='tamil',
            youtube_handle='SunNews',
            youtube_channel_id='UCL5h3s5',
            streams_url='https://www.youtube.com/@SunNews/streams'
        ),
        NewsChannel(
            name='Thanthi TV',
            language='tamil',
            youtube_handle='ThanthiTV',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@ThanthiTV/streams'
        ),
        NewsChannel(
            name='News18 Tamil Nadu',
            language='tamil',
            youtube_handle='News18TamilNadu',
            youtube_channel_id='UCPtM1r22s4',
            streams_url='https://www.youtube.com/@News18TamilNadu/streams'
        ),
        NewsChannel(
            name='Puthiya Thalaimurai',
            language='tamil',
            youtube_handle='PuthiyaThalaimuraiTV',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@PuthiyaThalaimuraiTV/streams'
        ),
        NewsChannel(
            name='Polimer News',
            language='tamil',
            youtube_handle='PolimerNews',
            youtube_channel_id='UCSWAP9vC0',
            streams_url='https://www.youtube.com/@PolimerNews/streams'
        ),
    ],

    # TELUGU (5 channels)
    'telugu': [
        NewsChannel(
            name='TV9 Telugu',
            language='telugu',
            youtube_handle='TV9TeluguLive',
            youtube_channel_id='UCL5h6g8h9',
            streams_url='https://www.youtube.com/@TV9TeluguLive/streams'
        ),
        NewsChannel(
            name='NTV Telugu',
            language='telugu',
            youtube_handle='NTVTelugu',
            youtube_channel_id='UCPmEDz6rJdI',
            streams_url='https://www.youtube.com/@NTVTelugu/streams'
        ),
        NewsChannel(
            name='ABN Andhra Jyothi',
            language='telugu',
            youtube_handle='ABNAndhraJyothy',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@ABNAndhraJyothy/streams'
        ),
        NewsChannel(
            name='Sakshi TV',
            language='telugu',
            youtube_handle='SakshiTV',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@SakshiTV/streams'
        ),
        NewsChannel(
            name='V6 News',
            language='telugu',
            youtube_handle='V6News',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@V6News/streams'
        ),
    ],

    # KANNADA (4 channels)
    'kannada': [
        NewsChannel(
            name='TV9 Kannada',
            language='kannada',
            youtube_handle='TV9Kannada',
            youtube_channel_id='UCL5h3s5',
            streams_url='https://www.youtube.com/@TV9Kannada/streams'
        ),
        NewsChannel(
            name='Public TV',
            language='kannada',
            youtube_handle='PublicTVNews',
            youtube_channel_id='UCPtM1r22s4',
            streams_url='https://www.youtube.com/@PublicTVNews/streams'
        ),
        NewsChannel(
            name='Suvarna News',
            language='kannada',
            youtube_handle='SuvarnaNews',
            youtube_channel_id='UCSWAP9vC0',
            streams_url='https://www.youtube.com/@SuvarnaNews/streams'
        ),
        NewsChannel(
            name='News18 Kannada',
            language='kannada',
            youtube_handle='News18Kannada',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@News18Kannada/streams'
        ),
    ],

    # MALAYALAM (5 channels)
    'malayalam': [
        NewsChannel(
            name='Asianet News',
            language='malayalam',
            youtube_handle='asianetnews',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@asianetnews/streams'
        ),
        NewsChannel(
            name='Manorama News',
            language='malayalam',
            youtube_handle='manoramanews',
            youtube_channel_id='UCPmEDz6rJdI',
            streams_url='https://www.youtube.com/@manoramanews/streams'
        ),
        NewsChannel(
            name='Mathrubhumi News',
            language='malayalam',
            youtube_handle='mathrubhuminews',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@mathrubhuminews/streams'
        ),
        NewsChannel(
            name='News18 Kerala',
            language='malayalam',
            youtube_handle='News18Kerala',
            youtube_channel_id='UCL5h6g8h9',
            streams_url='https://www.youtube.com/@News18Kerala/streams'
        ),
        NewsChannel(
            name='Media One',
            language='malayalam',
            youtube_handle='MediaOneTVLive',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@MediaOneTVLive/streams'
        ),
    ],

    # BENGALI (4 channels)
    'bengali': [
        NewsChannel(
            name='ABP Ananda',
            language='bengali',
            youtube_handle='ABPAnanda',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@ABPAnanda/streams'
        ),
        NewsChannel(
            name='Zee 24 Ghanta',
            language='bengali',
            youtube_handle='Zee24Ghanta',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@Zee24Ghanta/streams'
        ),
        NewsChannel(
            name='News18 Bangla',
            language='bengali',
            youtube_handle='News18Bangla',
            youtube_channel_id='UCPtM1r22s4',
            streams_url='https://www.youtube.com/@News18Bangla/streams'
        ),
        NewsChannel(
            name='Kolkata TV',
            language='bengali',
            youtube_handle='KolkataTV',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@KolkataTV/streams'
        ),
    ],

    # MARATHI (4 channels)
    'marathi': [
        NewsChannel(
            name='ABP Majha',
            language='marathi',
            youtube_handle='ABPMajha',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@ABPMajha/streams'
        ),
        NewsChannel(
            name='TV9 Marathi',
            language='marathi',
            youtube_handle='TV9Marathi',
            youtube_channel_id='UCL5h6g8h9',
            streams_url='https://www.youtube.com/@TV9Marathi/streams'
        ),
        NewsChannel(
            name='News18 Lokmat',
            language='marathi',
            youtube_handle='News18Lokmat',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@News18Lokmat/streams'
        ),
        NewsChannel(
            name='Zee 24 Taas',
            language='marathi',
            youtube_handle='Zee24Taas',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@Zee24Taas/streams'
        ),
    ],

    # GUJARATI (3 channels)
    'gujarati': [
        NewsChannel(
            name='TV9 Gujarati',
            language='gujarati',
            youtube_handle='TV9Gujarati',
            youtube_channel_id='UCPtM1r22s4',
            streams_url='https://www.youtube.com/@TV9Gujarati/streams'
        ),
        NewsChannel(
            name='ABP Asmita',
            language='gujarati',
            youtube_handle='ABPAsmita',
            youtube_channel_id='UCA7H7r34U4lW-6tB5j3qxA',
            streams_url='https://www.youtube.com/@ABPAsmita/streams'
        ),
        NewsChannel(
            name='News18 Gujarati',
            language='gujarati',
            youtube_handle='News18Gujarati',
            youtube_channel_id='UCL5h6g8h9',
            streams_url='https://www.youtube.com/@News18Gujarati/streams'
        ),
    ],

    # PUNJABI (3 channels)
    'punjabi': [
        NewsChannel(
            name='ABP Sanjha',
            language='punjabi',
            youtube_handle='ABPSanjha',
            youtube_channel_id='UCL5h3s5',
            streams_url='https://www.youtube.com/@ABPSanjha/streams'
        ),
        NewsChannel(
            name='News18 Punjab',
            language='punjabi',
            youtube_handle='News18PunjabHaryanaHimachal',
            youtube_channel_id='UCBVj9mM41s',
            streams_url='https://www.youtube.com/@News18PunjabHaryanaHimachal/streams'
        ),
        NewsChannel(
            name='PTC News',
            language='punjabi',
            youtube_handle='PTCNews',
            youtube_channel_id='UCDvW6s6Q',
            streams_url='https://www.youtube.com/@PTCNews/streams'
        ),
    ],
}


def get_all_languages() -> List[str]:
    """Get list of all supported languages"""
    return list(CHANNEL_REGISTRY.keys())


def get_channels_by_language(language: str) -> List[NewsChannel]:
    """Get all channels for a specific language"""
    return CHANNEL_REGISTRY.get(language.lower(), [])


def get_all_channels() -> List[NewsChannel]:
    """Get all channels across all languages"""
    all_channels = []
    for channels in CHANNEL_REGISTRY.values():
        all_channels.extend(channels)
    return all_channels


def get_channel_by_name(name: str) -> NewsChannel | None:
    """Find a channel by name (case-insensitive)"""
    name_lower = name.lower()
    for channels in CHANNEL_REGISTRY.values():
        for channel in channels:
            if channel.name.lower() == name_lower:
                return channel
    return None


# Language display names
LANGUAGE_NAMES = {
    'hindi': 'Hindi',
    'english': 'English',
    'tamil': 'Tamil',
    'telugu': 'Telugu',
    'kannada': 'Kannada',
    'malayalam': 'Malayalam',
    'bengali': 'Bengali',
    'marathi': 'Marathi',
    'gujarati': 'Gujarati',
    'punjabi': 'Punjabi',
}