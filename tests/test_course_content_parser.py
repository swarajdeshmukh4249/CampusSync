from campussync.volp_client import (
    _content_nodes,
    _merge_items,
    _normalise_assignment,
    _normalise_material,
)


def test_nested_course_content_keeps_its_section_and_finds_assignment():
    content = {
        "title": "Unit 3: Trees",
        "items": [
            {
                "content_type": "Assignment",
                "id": 42,
                "title": "AVL implementation",
                "deadline": "2026-09-01 23:59:00",
            }
        ],
    }

    found = [
        assignment
        for item, section in _content_nodes(content)
        if (assignment := _normalise_assignment(item, 10, 20, section))
    ]

    assert found == [{
        "assignment_id": 42,
        "assignment_name": "AVL implementation",
        "description": "",
        "due_date": "2026-09-01 23:59:00",
        "start_date": "",
        "is_submitted": False,
        "submission_date": None,
        "max_marks": 0,
        "section": "Unit 3: Trees",
        "crsid": 10,
        "colid": 20,
    }]


def test_nested_course_content_finds_teacher_attachment_and_deduplicates_it():
    content = {
        "module_name": "Normalization",
        "children": [{
            "content_type": "Document",
            "content_id": "file-1",
            "content_name": "Normal forms notes",
            "attachment": {"url": "https://volptestbucket.s3.ap-south-1.amazonaws.com/notes.pdf"},
        }],
    }

    found = [
        material
        for item, section in _content_nodes(content)
        if (material := _normalise_material(item, 11, 21, section))
    ]

    assert found[0]["title"] == "Normal forms notes"
    assert found[0]["chapter"] == "Normalization"
    assert found[0]["file_url"].endswith("notes.pdf")
    assert len(_merge_items(found, found, id_key="material_id")) == 1
