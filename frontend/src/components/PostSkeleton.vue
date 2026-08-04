<template>
  <UCard variant="ghost" class="p-4 md:p-6 lg:p-8">
    <template #header>
      <div class="flex flex-col gap-3">
        <USkeleton class="h-8 w-3/4" />
        <USkeleton class="h-5 w-1/2" />
      </div>
    </template>
    <div class="flex flex-col gap-3">
      <div v-for="(_, index) in 6" :key="index" class="flex flex-col gap-2">
        <USkeleton v-if="index % 2 === 0" class="h-4 w-full" />
        <USkeleton v-else class="h-4 w-[90%]" />
      </div>
      <USkeleton class="h-64 w-full rounded-lg mt-2" />
      <div v-for="(_, index) in 4" :key="`p${index}`" class="flex flex-col gap-2">
        <USkeleton class="h-4 w-full" />
      </div>
    </div>
  </UCard>
</template>
