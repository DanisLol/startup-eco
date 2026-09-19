-- Demo insurance: a ready volcano lesson with a known join code.
-- Safe to re-run.

insert into families (phone, code, child_name, child_age)
values ('+15555550107', 'MIA4K2', 'Mia', 7)
on conflict (code) do update
  set child_name = excluded.child_name,
      child_age = excluded.child_age,
      phone = excluded.phone;

insert into lessons (family_id, topic, status, roadmap, artifact)
select
  f.id,
  'volcanoes',
  'ready',
  '["Lesson 1: Why Volcanoes Erupt","Lesson 2: Inside the Earth","Lesson 3: Famous Volcanoes","Lesson 4: How to Stay Safe"]'::jsonb,
  '{
    "lessonTitle": "Why Volcanoes Erupt",
    "wrapUp": "You learned that magma is melted rock, lava is magma that comes out, and volcanoes erupt when that hot rock finds a way up. Next time you see a picture of a volcano, you will know what is happening inside.",
    "steps": [
      {
        "id": "explain-1",
        "type": "explain",
        "title": "A mountain that can wake up",
        "paragraphs": [
          "A volcano is a mountain with a hot surprise inside.",
          "Deep under your feet, rock can get so hot it melts. That melted rock is called magma.",
          "Magma wants to rise, like bubbles in a fizzy drink. When it finds a weak spot in the ground, it pushes up. That is an eruption."
        ]
      },
      {
        "id": "quiz-1",
        "type": "quiz",
        "question": "What is magma?",
        "choices": [
          "Cold ice under a mountain",
          "Melted rock under the ground",
          "Rain that falls into caves",
          "Wind that spins in a storm"
        ],
        "correctIndex": 1,
        "explanation": "Magma is rock that got so hot it melted. It lives under the ground until a volcano lets it out."
      },
      {
        "id": "explain-2",
        "type": "explain",
        "title": "When magma becomes lava",
        "paragraphs": [
          "Once magma comes out of the volcano, we give it a new name: lava.",
          "Lava is very hot, so it glows orange and red. It moves like thick honey pouring down a hill.",
          "Some lava is runny and travels far. Some lava is thick and piles up into a steep mountain."
        ]
      },
      {
        "id": "quiz-2",
        "type": "quiz",
        "question": "What do we call magma after it comes out of the volcano?",
        "choices": ["Steam", "Ash", "Lava", "Dust"],
        "correctIndex": 2,
        "explanation": "Inside the mountain it is magma. The moment it comes out, we call it lava."
      },
      {
        "id": "reflect-1",
        "type": "reflect",
        "prompt": "If you could stand somewhere safe and watch a volcano, what would you want to look at first? Tell your grown-up in a sentence."
      }
    ]
  }'::jsonb
from families f
where f.code = 'MIA4K2'
  and not exists (
    select 1 from lessons l
    where l.family_id = f.id and l.topic = 'volcanoes' and l.status = 'ready'
  );
