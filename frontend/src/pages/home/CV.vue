<template>
  <div class="min-w-full min-h-full p-4 md:p-6 lg:p-8">
    <UContainer class="max-w-9/10">
      <UBreadcrumb :items="breadcrumbItems" class="mb-6" />
      <UPageHeader title="Resume & Professional Experience" class="mb-8" />
      <div class="lg:col-span-9 space-y-6">
        <UCard id="summary">
          <template #header>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 class="text-2xl md:text-3xl font-bold">Gift Mugweni</h1>
                <p class="text-lg text-primary mt-1">Intermediate Software Developer I @ Skynamo</p>
                <p class="text-sm text-muted mt-1">City of Cape Town, Western Cape, South Africa</p>
              </div>
              <UButton
                href="/Profile.pdf"
                target="_blank"
                icon="i-heroicons-arrow-down-tray-20-solid"
                size="sm"
              >
                Download CV
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Contact</h3>
              <div class="flex flex-col gap-1 text-sm">
                <a href="mailto:giftmugweni@gmail.com" class="text-primary hover:underline">
                  giftmugweni@gmail.com
                </a>
                <a
                  href="https://www.linkedin.com/in/gift-mugweni"
                  target="_blank"
                  class="text-primary hover:underline"
                >
                  linkedin.com/in/gift-mugweni
                </a>
              </div>
            </div>

            <div>
              <h3 class="font-semibold mb-2">Summary</h3>
              <p class="text-sm leading-relaxed">
                I am a dedicated and skilled professional with a Bachelor of Science in Electrical
                and Computer Engineering. With experience as a Software Developer, I have honed my
                skills in Data Integration, Vue.js, Web Application Development, Cloud Computing,
                C#, and TypeScript. I am passionate about creating innovative solutions and thrive
                in fast-paced environments. I am eager to leverage my technical expertise and
                contribute to impactful projects in software development.
              </p>
            </div>
          </div>
        </UCard>

        <section id="experience">
          <h2 class="text-xl font-bold mb-4">Experience</h2>
          <div class="space-y-4">
            <UCard v-for="job in experience" :key="job.role + job.company" variant="subtle">
              <template #header>
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 class="font-semibold">
                      {{ job.role }}
                    </h3>
                    <p class="text-sm text-primary">
                      {{ job.company }}
                    </p>
                  </div>
                  <div class="text-sm text-muted">
                    {{ job.duration }}
                  </div>
                </div>
              </template>

              <div class="flex flex-col gap-1">
                <p class="text-sm text-muted mb-2">
                  {{ job.location }}
                </p>
                <p v-for="(task, index) in job.tasks" :key="index" class="text-sm space-y-1">
                  {{ task }}
                </p>
              </div>
            </UCard>
          </div>
        </section>

        <section id="education">
          <h2 class="text-xl font-bold mb-4">Education</h2>
          <div class="space-y-4">
            <UCard v-for="edu in education" :key="edu.institution" variant="subtle">
              <template #header>
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 class="font-semibold">
                      {{ edu.institution }}
                    </h3>
                    <p class="text-sm text-primary">
                      {{ edu.degree }}
                    </p>
                  </div>
                  <div class="text-sm text-muted">
                    {{ edu.duration }}
                  </div>
                </div>
              </template>
            </UCard>
          </div>
        </section>

        <section id="skills">
          <h2 class="text-xl font-bold mb-4">Skills</h2>
          <UCard variant="subtle">
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="skill in skills" :key="skill" variant="soft" color="primary">
                {{ skill }}
              </UBadge>
            </div>
          </UCard>
        </section>

        <section id="certifications">
          <h2 class="text-xl font-bold mb-4">Certifications</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UCard v-for="cert in certifications" :key="cert.name" variant="subtle">
              <template #header>
                <h3 class="font-semibold text-sm">
                  {{ cert.name }}
                </h3>
              </template>
              <p class="text-xs text-muted">
                {{ cert.issuer }}
              </p>
            </UCard>
          </div>
        </section>

        <section id="awards">
          <h2 class="text-xl font-bold mb-4">Honors & Awards</h2>
          <div class="space-y-4">
            <UCard v-for="award in awards" :key="award.name" variant="subtle">
              <template #header>
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 class="font-semibold">
                    {{ award.name }}
                  </h3>
                  <span class="text-sm text-muted">
                    {{ award.year }}
                  </span>
                </div>
              </template>
              <p class="text-sm text-muted">
                {{ award.issuer }}
              </p>
              <p class="text-xs text-muted mt-2 italic">
                {{ award.description }}
              </p>
            </UCard>
          </div>
        </section>
      </div>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useSeoMeta } from "@unhead/vue";
import type { BreadcrumbItem } from "@nuxt/ui";

interface Experience {
  role: string;
  company: string;
  duration: string;
  location: string;
  tasks: string[];
}

interface Education {
  institution: string;
  degree: string;
  duration: string;
}

interface Award {
  name: string;
  issuer: string;
  description: string;
  year: string;
}

const experience: Experience[] = [
  {
    role: "Intermediate Software Developer I",
    company: "Skynamo",
    duration: "October 2025 - Present",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [],
  },
  {
    role: "Software Developer",
    company: "Skynamo",
    duration: "June 2024 - September 2025",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "I completed a project focused on enhancing the integration tools that enable the Skynamo App to connect with various accounting systems, including Xero, QuickBooks, and Sage 50 Pastel Partner.",
      "I developed two full integrations for Sage Pastel Partner and Xero, along with a set of reusable libraries that established a strong foundation for future integrations, including Sage Intacct and Sage One.",
      "Afterwards, I contributed to building the UI components for a new subscription management portal that provides customers with greater control and visibility over their Skynamo costs.",
      "I also assisted in rewriting the license service microservice responsible for managing user permissions mainly focusing and thee generation and management of integration tokens.",
    ],
  },
  {
    role: "Junior Software Developer",
    company: "Skynamo",
    duration: "January 2022 - June 2024",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "I played a key role in several projects that helped the company expand its offerings.",
      "I developed the data retrieval, caching, and processing layers for a new web-based analytics dashboard that gave customers insights into their sales, customers, and user activities.",
      "I also implemented comprehensive logging and metrics to monitor dashboard performance, track user behavior, and record errors, which made debugging and support much faster.",
      "Technologies used included Vue 3 with TypeScript and the IndexedDB API for analytics data caching.",
      "Additionally, I built a REST API for managing both user- and manager-assigned sales targets, designed with Clean Architecture principles and developed using Test-Driven Development (TDD).",
    ],
  },
  {
    role: "Computer Science Academic Tutor",
    company: "University of Cape Town",
    duration: "February 2019 - November 2021",
    location: "Cape Town Area, South Africa",
    tasks: [
      "Was an academic tutor for the first-year computer science course (CSC1017F and CSC1015F) that introduces students to programming using Python.",
      "Duties included assisting students with completing assignments, invigilation during class tests and marking test scripts for said class tests.",
    ],
  },
  {
    role: "EEE1006F Academic Tutor",
    company: "University of Cape Town",
    duration: "March 2021 - June 2021",
    location: "Cape Town, Western Cape, South Africa",
    tasks: [
      "Was an academic tutor for the EEE1006F course taught by the Electrical Department in the Engineering and Built Environment Faculty.",
      "The course aims to teach first-year electrical engineering students the basics of electronics of DC and AC circuits.",
      "My duties included assisting students with their practical circuit building as well as clarifying content in theory that may be confusing.",
    ],
  },
  {
    role: "Software Programmer",
    company: "Skynamo",
    duration: "July 2021",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "Created a mock Skynamo app in Flutter so as to investigate the ease of learning Flutter from scratch for mobile app development.",
    ],
  },
  {
    role: "Software Programmer",
    company: "Skynamo",
    duration: "December 2020",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "Worked on a machine learning project that sought to recognize product names, product codes and quantities from an email or text message.",
      "Heavily relied on Google's AutoML Natural Language Processing API for entity extraction for training the model.",
      "Due to a lack of readily available data, I also had to develop a fake email generator in Python that could randomly generate fake emails and tag them to be compatible with the AutoML API.",
    ],
  },
  {
    role: "Software Programmer",
    company: "Skynamo",
    duration: "July 2020",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "From 13th July to 31st July worked on a project where I wrote Python scripts to automate the uploading of android bundles for the creation of alpha and draft releases.",
      "Upon creating these scripts, they were combined with the GitLab CI/CD pipeline to allow for the automated triggering according to the pipeline build version.",
      "Created a SlackBot also in Python that used the GitLab and Google Developers API to allow for triggering the above scripts via slash commands and also to carry out staged rollout of existing app versions.",
    ],
  },
  {
    role: "Software Programmer",
    company: "Skynamo",
    duration: "November 2019 - January 2020",
    location: "Stellenbosch, Western Cape, South Africa",
    tasks: [
      "Was a software developer during the period and worked on various projects including:",
      "- Scripting in Python",
      "- Backend Development in C#",
      "- NodeJS Development",
      "- Frontend JavaScript Development",
    ],
  },
  {
    role: "Stock Controller",
    company: "Njeremoto Enterprises",
    duration: "December 2015 - January 2018",
    location: "Masvingo, Zimbabwe",
    tasks: [
      "Was involved in the day to day monitoring and procuring of stock items to ensure that the goods were readily available for customers.",
    ],
  },
  {
    role: "Programmer",
    company: "Les Mangondo",
    duration: "April 2016 - May 2017",
    location: "Masvingo, Zimbabwe",
    tasks: [
      "Was part of a four man team that worked to build a web based computerized monitoring and management system for company assets from scratch.",
      "The system was built with the ability to set routine maintenance schedules alongside creating on demand work schedules.",
      "On site communication was of importance and hence the system contained built in semi chat features to allow for such and a report generator to summarize the activities of the day.",
    ],
  },
];

const education: Education[] = [
  {
    institution: "University of Cape Town",
    degree: "Bachelor of Science - BS, Electrical and Computer Engineering",
    duration: "2018 - 2021",
  },
  {
    institution: "Kyle College",
    degree: "High School",
    duration: "2010 - 2015",
  },
];

const skills: string[] = [
  "Web Application Development",
  "Data Integration",
  "Cloud Computing",
  "Clean Architecture",
  "Test-Driven Development",
  "CI/CD",
  "Vue.js",
  ".Net",
  "NodeJS",
  "TypeScript",
  "Python",
];

const certifications = [
  {
    name: "C Programming for Embedded Applications",
    issuer: "Lifetime Member",
  },
  {
    name: "Learning Cloud Computing: Core Concepts",
    issuer: "Lifetime Member",
  },
  {
    name: "Machine Learning Specialization",
    issuer: "Lifetime Member",
  },
];

const awards: Award[] = [
  {
    name: "Skynamo Once Off Bursary",
    issuer: "Skynamo",
    description:
      "A once-off amount of R10000 was given as an award for being one of the top-performing interns during the internship period of November 2019 to January 2020",
    year: "2020",
  },
  {
    name: "Deans Merit List 2019",
    issuer: "University of Cape Town",
    description:
      "The Dean's Merit List is an award given in recognition of consistent academic excellence. Nominations for the Deans Merit List (DML) are based on above-average academic performance (GPA) being above 70%",
    year: "2019",
  },
  {
    name: "Engineering and Built Environment Faculty Scholarship",
    issuer: "University of Cape Town",
    description:
      " Engineering and Built Environment(EBE) Faculty Scholarships are awarded to registered students, on the basis of their results obtained during the first and second years of study in a three-year degree and the first, second and third years of study in a four-year degree. ",
    year: "2019",
  },
  {
    name: "Deans Merit List 2018",
    issuer: "University of Cape Town",
    description:
      "The Dean's Merit List is an award given in recognition of consistent academic excellence. Nominations for the Deans Merit List (DML) are based on above-average academic performance (GPA) being above 70%",
    year: "2018",
  },
  {
    name: "Engineering and Built Environment Faculty Scholarship",
    issuer: "University of Cape Town",
    description:
      " Engineering and Built Environment(EBE) Faculty Scholarships are awarded to registered students, on the basis of their results obtained during the first and second years of study in a three-year degree and the first, second and third years of study in a four-year degree. ",
    year: "2018",
  },
  {
    name: "Computer Science 1015 Merit Award",
    issuer: "University of Cape Town",
    description:
      "This award is given to students whose marks are within the top 5% of all the marks for said course for the year. ",
    year: "2018",
  },
  {
    name: "Top results in Zimbabwe for CIE A Level Computing",
    issuer: "Cambridge International Examinations",
    description:
      "British Council Zimbabwe administers Cambridge International Examinations in Zimbabwe, where Cambridge exams the greatest number of students in the region. The award is for obtaining the top marks in A Level Computing in the country for the 2015 Oct/Nov exam session",
    year: "2016",
  },
  {
    name: "Top results in Zimbabwe for CIE AS Level Computing",
    issuer: "Cambridge International Examinations",
    description:
      "British Council Zimbabwe administers Cambridge International Examinations in Zimbabwe, where Cambridge exams the greatest number of students in the region. The award is for obtaining the top marks in AS Level Computing in the country for the 2014 Oct/Nov exam session",
    year: "2015",
  },
  {
    name: "Full School Colors ",
    issuer: "Kyle College",
    description:
      "Full School colors for Academic Achievement in CIE O Levels(Obtained 5A*'s 5A's and 1B) in 2013 Oct/Nov exam session",
    year: "2014",
  },
];

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [{ label: "Home", to: "/" }, { label: "CV" }];
});

useSeoMeta({
  title: "Resume & Professional Experience",
  description:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  ogTitle: "Resume & Professional Experience",
  ogDescription:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Resume & Professional Experience",
  twitterDescription:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  twitterImage: "/assets/logo.png",
});
</script>
