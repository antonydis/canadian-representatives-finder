from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Office:
    type: str
    tel: Optional[str] = None
    fax: Optional[str] = None
    postal: Optional[str] = None


@dataclass
class Representative:
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    elected_office: str = ""
    level: str = ""
    party_name: Optional[str] = None
    district_name: str = ""
    representative_set_name: str = ""
    email: Optional[str] = None
    url: Optional[str] = None
    personal_url: Optional[str] = None
    photo_url: Optional[str] = None
    offices: list = field(default_factory=list)
    source_url: str = ""
    boundary_url: str = ""

    def get_phone(self) -> Optional[str]:
        """Return the first available phone number from offices."""
        for office in self.offices:
            if office.tel:
                return office.tel
        return None
