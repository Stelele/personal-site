<template>
  <div class="navbar bg-base-100">
      <div class="flex-1">
        <NuxtLink to="/" class="btn btn-ghost text-xl">daisyUI</NuxtLink>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
          <li><NuxtLink to="/Blog">Blog</NuxtLink></li>
          <li>
            <details>
              <summary>
                Projects
              </summary>
              <ul class="p-2 bg-base-100 rounded-t-none">
                <li><NuxtLink to="/projects/Games">Games</NuxtLink></li>
                <li><NuxtLink to="/projects/WebApps">Web Apps</NuxtLink></li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
  </div>
</template>

<script lang="ts" setup>

</script>

<style>

</style>